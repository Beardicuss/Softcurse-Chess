import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// ── Module imports ──────────────────────────────────────────────
import { W, B, initGame, findKing, legalMoves, doMove } from "./chessEngine.js";
import { getNeuralMove } from "./aiEngine.js";
import { makePiece, preloadModels } from "./pieceFactory.js";
import { AudioEngine } from "./audioEngine.js";
import { SZ, OFF, toWorld, DARK_SQ, LIGHT_SQ, THEME, ASSET_CDN } from "./constants.js";
import ChessUI from "./ChessUI.jsx";
import { createGalaxyBackground } from "./galaxyBackground.js";
import * as OnlineEngine from "./onlineEngine.js";
import { updateAntiqueStoneMaterials } from './antiqueStoneMaterial.js';

// ═══════════════════════════════════════════════════════════════
//  ORCHESTRATOR COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function BattleChess3D() {
  const mountRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [msg, setMsg] = useState("TURN_W");
  const [caps, setCaps] = useState({ w: [], b: [] });
  const [moveCount, setMoveCount] = useState(0);
  const [mode, setMode] = useState("pvp");
  const [diff, setDiff] = useState("SOLDIER");
  const [playerSide, setPlayerSide] = useState("w");
  const [thinking, setThinking] = useState(false);
  const [promoModal, setPromoModal] = useState(null);
  const [moveLog, setMoveLog] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const logRef = useRef(null);

  // ── Phased loading state ────────────────────────────────────
  const [phase1Ready, setPhase1Ready] = useState(false);
  const [allPhasesReady, setAllPhasesReady] = useState(false);
  const [phase1Progress, setPhase1Progress] = useState(0);

  // ── Stable refs ───────────────────────────────────────────────
  const gameStartedRef = useRef(false);
  const modeRef = useRef("pvp");
  const diffRef = useRef("SOLDIER");
  const playerSideRef = useRef(W);
  const onlineRef = useRef(false);     // true when in online PvP
  const onlineMoveRef = useRef(null);  // stores { fr, ff, tr, tf, promo } from opponent
  const gsRef = useRef(initGame());
  const historyRef = useRef([]);
  const pendingLogRef = useRef({ w: null, b: null });
  const animatingRef = useRef(false);
  const aiPendingRef = useRef(false);

  // Camera state refs for smooth motion
  const camState = useRef({
    theta: 0.3,
    phi: 0.55,
    dist: 11.5,
    targetTheta: 0.3,
    targetPhi: 0.55,
    targetDist: 11.5,
  });

  const setModeFixed = useCallback((m) => {
    modeRef.current = m;
    setMode(m);
    window.dispatchEvent(new CustomEvent('battle-mode-changed'));
  }, []);
  const setDiffFixed = useCallback((d) => {
    diffRef.current = d;
    setDiff(d);
  }, []);

  const handleMenuStart = useCallback((cfg) => {
    window._battleChessMenuStart?.(cfg);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [moveLog]);

  useEffect(() => {
    const el = mountRef.current;
    let EW = el.clientWidth, EH = el.clientHeight;
    let destroyed = false;

    // ── Device detection ─────────────────────────────────────────
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

    // ── Scene ───────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEME.bg);
    scene.fog = new THREE.FogExp2(THEME.bg, THEME.fogDensity);
    const camera = new THREE.PerspectiveCamera(50, EW / EH, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: "high-performance" });
    renderer.setSize(EW, EH);
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    el.appendChild(renderer.domElement);

    // ── Galaxy (PC only) ─────────────────────────────────────────
    const galaxy = isMobile ? null : createGalaxyBackground(scene);

    // ── Lights ───────────────────────────────────────────────────
    if (isMobile) {
      // Mobile: ambient + 1 directional top-down, no shadows
      scene.add(new THREE.AmbientLight(0xffffff, 1.8));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
      dirLight.position.set(0, 10, 0);
      dirLight.castShadow = false;
      scene.add(dirLight);
    } else {
      // PC: low ambient so shadows are visible
      scene.add(new THREE.AmbientLight(0xffffff, 0.4));

      // Light 1: top-down left — main, casts shadows
      const topLeft = new THREE.DirectionalLight(0xffffff, 2.2);
      topLeft.position.set(-4, 14, 0);
      topLeft.target.position.set(0, 0, 0);
      topLeft.castShadow = true;
      topLeft.shadow.mapSize.set(1024, 1024);
      topLeft.shadow.camera.near = 1;
      topLeft.shadow.camera.far = 25;
      topLeft.shadow.camera.left = -7;
      topLeft.shadow.camera.right = 7;
      topLeft.shadow.camera.top = 7;
      topLeft.shadow.camera.bottom = -7;
      topLeft.shadow.bias = -0.001;
      scene.add(topLeft);
      scene.add(topLeft.target);

      // Light 2: top-down right — fill, no shadow
      const topRight = new THREE.DirectionalLight(0xffffff, 1.4);
      topRight.position.set(4, 14, 0);
      topRight.castShadow = false;
      scene.add(topRight);

      // Light 3: left wall → board (neutral tint now)
      const leftWall = new THREE.DirectionalLight(0xffffff, 1.0);
      leftWall.position.set(-12, 5, 0);
      leftWall.castShadow = false;
      scene.add(leftWall);

      // Light 4: right wall → board (neutral tint now)
      const rightWall = new THREE.DirectionalLight(0xffffff, 1.0);
      rightWall.position.set(12, 5, 0);
      rightWall.castShadow = false;
      scene.add(rightWall);

      // Light 5: black piece fill — low front light to reveal dark figure details (neutral tint)
      const blackFill = new THREE.DirectionalLight(0xffffff, 3.5);
      blackFill.position.set(0, 3, 14); // from black side, low angle
      blackFill.castShadow = false;
      scene.add(blackFill);
    }

    // ── Board (Phased Loading) ────────────────────────────────────
    const boardGrp = new THREE.Group();
    scene.add(boardGrp);
    const gltfLoader = new GLTFLoader();

    function addBoardModel(gltf, preserveMaterials = false) {
      const model = gltf.scene;
      model.position.set(0, -0.25, 0);
      model.scale.setScalar(0.45);
      model.traverse(node => {
        if (node.isMesh) {
          node.geometry.computeBoundingSphere();
          // Hide baked-in sky domes or background proxy spheres from the 3D assets
          if (node.geometry.boundingSphere && node.geometry.boundingSphere.radius > 45) {
            node.visible = false;
            return;
          }

          node.receiveShadow = !isMobile;
          node.castShadow = false;
          if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach(m => {
              m.envMap = null;
              m.envMapIntensity = 0;
              // Do NOT override color — preserve original texture
              if (!preserveMaterials) {
                m.roughness = 0.85;   // matte, not shiny
                m.metalness = 0.0;
                if (m.specular) m.specular.setHex(0x111111); // kill specular
                if (m.shininess !== undefined) m.shininess = 0;
                if (m.emissive) { m.emissive.setHex(0x000000); m.emissiveIntensity = 0; }
              }
              m.needsUpdate = true;
            });
          }
        }
      });
      boardGrp.add(model);
    }

    // Phase 1: board + ground + figures + walls
    const phase1Total = 4; // board, ground, walls, figures
    let phase1Loaded = 0;
    const phase1tick = () => { phase1Loaded++; setPhase1Progress(phase1Loaded / phase1Total); };

    const p1Board = new Promise((res, rej) => gltfLoader.load(`${ASSET_CDN}/board.glb`, g => { addBoardModel(g); phase1tick(); res(); }, undefined, rej));
    const p1Ground = new Promise((res, rej) => gltfLoader.load(`${ASSET_CDN}/ground.glb`, g => { addBoardModel(g); phase1tick(); res(); }, undefined, rej));
    // Let walls.glb KEEP its authored metallic/roughness values from the generated textures
    const p1Walls = new Promise((res, rej) => gltfLoader.load(`${ASSET_CDN}/walls.glb`, g => { addBoardModel(g, true); phase1tick(); res(); }, undefined, rej));
    const p1Figures = preloadModels().then(() => phase1tick());

    window.addEventListener("keydown", (e) => {
      if (e.key === "0") {
        console.log("SCENE DUMP:");
        scene.traverse(node => {
          if (node.isMesh) {
            console.log(`MESH: ${node.name || 'unnamed'} - Geometry: ${node.geometry.type} - Material: ${node.material.type} - Radius: ${node.geometry.boundingSphere?.radius}`);
          }
        });
      }
    });

    Promise.all([p1Board, p1Ground, p1Walls, p1Figures]).then(() => {
      setPhase1Ready(true);
      setAllPhasesReady(true);
    });

    const sqMeshes = [];
    const hitMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, visible: false, depthWrite: false });
    for (let r = 0; r < 8; r++) {
      sqMeshes[r] = [];
      for (let f = 0; f < 8; f++) {
        const mat = hitMat.clone();
        const m = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), mat);
        const pos = toWorld(r, f);
        m.rotation.x = -Math.PI / 2;
        m.position.set(pos.x, 0.015, pos.z);
        m.userData = { r, f, mat };
        boardGrp.add(m);
        sqMeshes[r][f] = m;
      }
    }

    const PM = {};
    function spawnAll(board) {
      Object.values(PM).forEach(m => scene.remove(m));
      for (const k in PM) delete PM[k];
      for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++) {
          const p = board[r][f];
          if (p) {
            const m = makePiece(p.t, p.c);
            const pos = toWorld(r, f);
            m.position.set(pos.x, 0.0, pos.z);
            if (p.c === W) m.rotation.y = Math.PI;
            m.userData = { ...m.userData, r, f };
            scene.add(m); PM[`${r},${f}`] = m;
          }
        }
    }

    const particles = [];
    function mkBurst(pos, col, sz = 0.07, N = 90) {
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(N * 3);
      const vel = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y + 0.3; arr[i * 3 + 2] = pos.z;
        vel[i * 3] = (Math.random() - 0.5) * 0.22;
        vel[i * 3 + 1] = Math.random() * 0.22 + 0.05;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.22;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.PointsMaterial({ color: col, size: sz, transparent: true, opacity: 1 });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts); let life = 0;
      return () => {
        life += 0.04;
        const p = geo.attributes.position.array;
        for (let i = 0; i < N; i++) {
          vel[i * 3 + 1] -= 0.006;
          p[i * 3] += vel[i * 3]; p[i * 3 + 1] += vel[i * 3 + 1]; p[i * 3 + 2] += vel[i * 3 + 2];
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - life / 1.6);
        if (life >= 1.6) { scene.remove(pts); return false; }
        return true;
      };
    }

    const DOT_POOL = Array.from({ length: 28 }, () => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m;
    });
    const RING_POOL = Array.from({ length: 28 }, () => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.44, 24), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m;
    });
    const selLight = new THREE.PointLight(0xffffff, 0, 2.5);
    selLight.castShadow = false;
    scene.add(selLight);

    function clearHL() {
      sqMeshes.flat().forEach(m => { m.userData.mat.opacity = 0; m.userData.mat.visible = false; });
      DOT_POOL.forEach(m => { m.visible = false; m.material.opacity = 0; });
      RING_POOL.forEach(m => { m.visible = false; m.material.opacity = 0; });
      selLight.intensity = 0;
    }
    function showHL(sel, moves, last, checkC, board) {
      clearHL();
      let cHex = THEME.brass; // fallback
      if (sel) {
        const [r, f] = sel;
        const pc = board[r][f];
        if (pc) cHex = pc.c === 'w' ? THEME.whiteAccent : THEME.blackAccent;

        const m = sqMeshes[r][f];
        m.userData.mat.visible = true;
        m.userData.mat.color.setHex(cHex);
        m.userData.mat.opacity = 0.45;

        // Activate glowing colored physical light underneath the piece
        selLight.color.setHex(cHex);
        selLight.intensity = 6.0;
        const sPos = toWorld(r, f);
        selLight.position.set(sPos.x, 0.4, sPos.z);
      }
      moves.forEach(([tr, tf], i) => {
        const isCap = board[tr][tf] !== null;
        const pool = isCap ? RING_POOL : DOT_POOL;
        const m = pool[i]; if (!m) return;
        const pos = toWorld(tr, tf);
        m.position.set(pos.x, 0.08, pos.z);
        m.material.color.setHex(cHex);
        m.visible = true; m.material.opacity = 0.8;
      });
      if (last) {
        const f = sqMeshes[last.fr][last.ff], t = sqMeshes[last.tr][last.tf];
        f.userData.mat.visible = t.userData.mat.visible = true;
        f.userData.mat.color.setHex(0x554422); f.userData.mat.opacity = 0.3;
        t.userData.mat.color.setHex(0x776633); t.userData.mat.opacity = 0.4;
      }
      if (checkC) {
        const [kr, kf] = findKing(board, checkC);
        const m = sqMeshes[kr][kf]; m.userData.mat.visible = true; m.userData.mat.color.setHex(0xff0000); m.userData.mat.opacity = 0.45;
      }
    }

    function animPiece(mesh, target, duration, cb) {
      const start = mesh.position.clone();
      let elapsed = 0; animatingRef.current = true;
      const step = () => {
        elapsed += 0.016; const t = Math.min(elapsed / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        mesh.position.lerpVectors(start, target, ease);
        if (t < 1) requestAnimationFrame(step); else { animatingRef.current = false; cb?.(); }
      };
      step();
    }

    function battleAnim(attacker, victim, target, col, cb) {
      const start = attacker.position.clone();
      let elapsed = 0; animatingRef.current = true;
      const step = () => {
        elapsed += 0.016; const t = Math.min(elapsed / 0.45, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        attacker.position.lerpVectors(start, target, ease);
        if (t >= 0.7 && victim.parent) {
          particles.push(mkBurst(victim.position, col));
          scene.remove(victim);
        }
        if (t < 1) requestAnimationFrame(step); else { animatingRef.current = false; cb?.(); }
      };
      step();
    }

    function statusMsg(gs, lastColor) {
      if (gs.status === "checkmate") return lastColor === W ? "MATE_W" : "MATE_B";
      if (gs.status === "stalemate") return "STALEMATE";
      return gs.status === "check" ? (gs.turn === W ? "CHECK_W" : "CHECK_B") : (gs.turn === W ? "TURN_W" : "TURN_B");
    }

    function doAITurn(retries = 0) {
      const MAX_RETRIES = 2;
      if (aiPendingRef.current && retries === 0) { console.warn("[doAITurn] BLOCKED — aiPendingRef still true"); return; }
      if (animatingRef.current) { console.warn("[doAITurn] BLOCKED — animatingRef still true"); return; }
      const g = gsRef.current;
      if (g.status !== "playing" && g.status !== "check") { console.warn("[doAITurn] BLOCKED — game status:", g.status); return; }
      aiPendingRef.current = true; setThinking(true);
      console.log(`[doAITurn] Requesting neural move (attempt ${retries + 1})...`, "turn:", g.turn);

      getNeuralMove(g, diffRef.current).then(result => {
        if (result && result.move) {
          const [fr, ff, tr, tf, promo] = result.move;
          const piece = g.board[fr]?.[ff];
          console.log("[doAITurn] Got move:", result.move, "provider:", result.provider, "piece:", piece);

          // Validate: piece exists and belongs to AI
          if (!piece || piece.c !== g.turn) {
            console.error("[doAITurn] INVALID — no piece or wrong color at", fr, ff);
            if (retries < MAX_RETRIES) {
              console.log("[doAITurn] Retrying...");
              setTimeout(() => doAITurn(retries + 1), 300);
              return;
            }
            console.warn("[doAITurn] Max retries exhausted, falling back to random legal move");
            playRandomLegal(g); return;
          }

          // Validate: move is legal
          const legal = legalMoves(g, fr, ff);
          const isLegal = legal.some(([lr, lf]) => lr === tr && lf === tf);
          if (!isLegal) {
            console.error("[doAITurn] ILLEGAL move:", fr, ff, "→", tr, tf);
            if (retries < MAX_RETRIES) {
              console.log("[doAITurn] Retrying...");
              setTimeout(() => doAITurn(retries + 1), 300);
              return;
            }
            console.warn("[doAITurn] Max retries exhausted, falling back to random legal move");
            playRandomLegal(g); return;
          }

          setThinking(false); aiPendingRef.current = false;
          executeMove(fr, ff, tr, tf, promo);
        } else {
          console.warn("[Neural AI] All providers failed");
          if (retries < MAX_RETRIES) {
            setTimeout(() => doAITurn(retries + 1), 500);
            return;
          }
          console.warn("[doAITurn] Falling back to random legal move");
          playRandomLegal(g);
        }
      }).catch(err => {
        console.error("[doAITurn] CRASH:", err);
        if (retries < MAX_RETRIES) {
          setTimeout(() => doAITurn(retries + 1), 500);
          return;
        }
        playRandomLegal(g);
      });
    }

    function playRandomLegal(g) {
      setThinking(false); aiPendingRef.current = false;
      // Collect all legal moves for the current turn
      const allMoves = [];
      for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++)
          if (g.board[r][f]?.c === g.turn)
            for (const [tr, tf] of legalMoves(g, r, f))
              allMoves.push([r, f, tr, tf]);
      if (allMoves.length === 0) { console.error("[playRandomLegal] No legal moves!"); return; }
      const pick = allMoves[Math.floor(Math.random() * allMoves.length)];
      console.log("[playRandomLegal] Playing fallback:", pick);
      executeMove(...pick);
    }

    function executeMove(fr, ff, tr, tf, chosenPromo = "Q") {
      const g = gsRef.current; const piece = g.board[fr][ff]; if (!piece) return;
      const isPawnPromo = piece.t === "P" && (tr === 0 || tr === 7);
      if (isPawnPromo && !chosenPromo) {
        setPromoModal({ color: piece.c, onSelect: (p) => { setPromoModal(null); executeMove(fr, ff, tr, tf, p); } });
        window._battleChessPromoChoice = (p) => { setPromoModal(null); executeMove(fr, ff, tr, tf, p); };
        return;
      }
      AudioEngine.move();
      const fk = `${fr},${ff}`, tk = `${tr},${tf}`, tPos = toWorld(tr, tf);
      const movMesh = PM[fk], capMesh = PM[tk];
      const wasEP = piece.t === "P" && g.ep && tr === g.ep[0] && tf === g.ep[1];
      const wasCastle = piece.t === "K" && Math.abs(tf - ff) === 2;
      const ngs = doMove(g, fr, ff, tr, tf, isPawnPromo ? chosenPromo : "Q");
      const castleRookFromKey = wasCastle ? `${fr},${tf === 6 ? 7 : 0}` : null;
      const castleRookToPos = wasCastle ? toWorld(fr, tf === 6 ? 5 : 3) : null;
      const castleRookToKey = wasCastle ? `${fr},${tf === 6 ? 5 : 3}` : null;
      const afterAnim = () => {
        historyRef.current.push(JSON.parse(JSON.stringify(g)));
        delete PM[fk];
        if (isPawnPromo) {
          scene.remove(movMesh); const newM = makePiece(chosenPromo, piece.c);
          newM.position.set(tPos.x, 0.0, tPos.z); newM.userData = { type: chosenPromo, color: piece.c, r: tr, f: tf };
          scene.add(newM); PM[tk] = newM;
          particles.push(mkBurst({ x: tPos.x, y: 0.3, z: tPos.z }, piece.c === W ? THEME.whiteAccent : THEME.blackAccent, 0.1, 120));
        } else { PM[tk] = movMesh; movMesh.userData = { ...movMesh.userData, r: tr, f: tf }; }
        if (wasCastle) {
          const rkM = PM[castleRookFromKey];
          if (rkM) { delete PM[castleRookFromKey]; animPiece(rkM, castleRookToPos, 0.32, () => { PM[castleRookToKey] = rkM; rkM.userData = { ...rkM.userData, r: fr, f: tf === 6 ? 5 : 3 }; finish(); }); }
          else finish();
        } else finish();
      };
      const finish = () => {
        gsRef.current = { ...ngs, sel: null, lm: [] }; animatingRef.current = false;
        const chkC = (ngs.status === "check" || ngs.status === "checkmate") ? ngs.turn : null;
        if (chkC) AudioEngine.check();
        showHL(null, [], ngs.last, chkC, ngs.board);
        setCaps({ w: ngs.capW, b: ngs.capB }); setMoveCount(c => c + 1); setMsg(statusMsg(ngs, piece.c));
        const note = ngs.last?.note ?? "?";
        if (piece.c === W) { pendingLogRef.current = { w: note, b: null }; setMoveLog(ml => [...ml, { w: note, b: null }]); }
        else {
          if (pendingLogRef.current?.b === null) {
            const upd = { ...pendingLogRef.current, b: note }; pendingLogRef.current = upd;
            setMoveLog(ml => { const n = [...ml]; n[n.length - 1] = upd; return n; });
          } else setMoveLog(ml => [...ml, { w: "—", b: note }]);
        }
        if (modeRef.current === "ai") localStorage.setItem("battleChessSave", JSON.stringify(ngs));
        // Online PvP: send move to opponent
        if (modeRef.current === "online" && onlineRef.current && piece.c === playerSideRef.current) {
          OnlineEngine.sendMove(fr, ff, tr, tf, isPawnPromo ? chosenPromo : "Q");
        }
        console.log("[finish] mode:", modeRef.current, "turn:", ngs.turn, "playerSide:", playerSideRef.current, "status:", ngs.status, "aiPending:", aiPendingRef.current, "animating:", animatingRef.current);
        if (modeRef.current === "ai" && ngs.turn !== playerSideRef.current && (ngs.status === "playing" || ngs.status === "check")) doAITurn();
      };
      if (wasEP) {
        const epK = `${fr},${tf}`;
        if (PM[epK]) { const ep = toWorld(fr, tf); particles.push(mkBurst({ x: ep.x, y: 0.3, z: ep.z }, THEME.whiteAccent)); scene.remove(PM[epK]); delete PM[epK]; }
      }
      if (!movMesh) { afterAnim(); return; } // piece mesh not yet loaded, skip animation
      if (capMesh && !wasEP) battleAnim(movMesh, capMesh, tPos, capMesh.userData.color === W ? THEME.whiteAccent : THEME.blackAccent, afterAnim);
      else animPiece(movMesh, tPos, 0.42, afterAnim);
    }

    function handleClick(r, f) {
      if (animatingRef.current) return;
      const g = gsRef.current;
      if (g.status === "checkmate" || g.status === "stalemate") return;
      if (modeRef.current === "ai" && g.turn !== playerSideRef.current) return;
      if (modeRef.current === "online" && g.turn !== playerSideRef.current) return;
      if (modeRef.current === "ai_vs_ai") return; // Spectator mode — no interaction
      if (g.sel) {
        const [sr, sf] = g.sel;
        if ((g.lm || []).some(([lr, lf]) => lr === r && lf === f)) { gsRef.current = { ...g, sel: null, lm: [] }; executeMove(sr, sf, r, f); }
        else if (g.board[r][f]?.c === g.turn) {
          const moves = legalMoves(g, r, f); gsRef.current = { ...g, sel: [r, f], lm: moves };
          showHL([r, f], moves, g.last, g.status === "check" ? g.turn : null, g.board);
        } else { gsRef.current = { ...g, sel: null, lm: [] }; showHL(null, [], g.last, g.status === "check" ? g.turn : null, g.board); }
      } else if (g.board[r][f]?.c === g.turn) {
        const moves = legalMoves(g, r, f); gsRef.current = { ...g, sel: [r, f], lm: moves };
        showHL([r, f], moves, g.last, g.status === "check" ? g.turn : null, g.board);
      }
    }

    function updateCam() {
      const { theta, phi, dist } = camState.current;
      const pitchMod = gameStartedRef.current ? 0 : 0.2;
      camera.position.x = dist * Math.sin(theta) * Math.cos(phi + pitchMod);
      camera.position.y = dist * Math.sin(phi + pitchMod);
      camera.position.z = dist * Math.cos(theta) * Math.cos(phi + pitchMod);
      camera.lookAt(0, 0.5, 0);
    }

    const ray = new THREE.Raycaster(); const mv2 = new THREE.Vector2();
    function getSquareFromHit(hits) {
      if (!hits.length) return null;
      // Filter hits to prioritize squares then pieces
      const sqHit = hits.find(h => h.object.userData.r !== undefined);
      if (sqHit) return [sqHit.object.userData.r, sqHit.object.userData.f];
      return null;
    }

    let isDrag = false, dsx = 0, dsy = 0, didMove = false;
    const onMouseDown = (e) => {
      AudioEngine.init();
      if (e.button === 2 || e.button === 0) {
        isDrag = true; didMove = false; dsx = e.clientX; dsy = e.clientY;
      }
    };
    const onMouseMove = (e) => {
      if (!isDrag) return;
      const dx = e.clientX - dsx, dy = e.clientY - dsy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMove = true;
      camState.current.targetTheta -= dx * 0.006;
      camState.current.targetPhi = Math.max(0.14, Math.min(Math.PI / 2.08, camState.current.targetPhi - dy * 0.006));
      dsx = e.clientX; dsy = e.clientY;
    };
    const onMouseUp = (e) => {
      isDrag = false;
      if (didMove) return;
      if (e.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mv2.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; mv2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mv2, camera);
      const hits = ray.intersectObjects([...sqMeshes.flat(), ...Object.values(PM)], true);
      const sq = getSquareFromHit(hits); if (sq) handleClick(sq[0], sq[1]);
    };

    const onMouseWheel = (e) => {
      e.preventDefault();
      const zoomAmount = e.deltaY > 0 ? 1.15 : 0.85;
      camState.current.targetDist = Math.max(5, Math.min(22, camState.current.targetDist * zoomAmount));
    };
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // ── Touch controls (mobile orbit / pinch-zoom / tap) ────────
    let touchStartX = 0, touchStartY = 0, touchDidMove = false, lastPinchDist = 0;
    const onTouchStart = (e) => {
      AudioEngine.init();
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchDidMove = false;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchDidMove = true;
        camState.current.targetTheta -= dx * 0.006;
        camState.current.targetPhi = Math.max(0.14, Math.min(Math.PI / 2.08, camState.current.targetPhi - dy * 0.006));
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist > 0) {
          const scale = lastPinchDist / dist;
          camState.current.targetDist = Math.max(5, Math.min(22, camState.current.targetDist * scale));
        }
        lastPinchDist = dist;
      }
    };
    const onTouchEnd = (e) => {
      if (touchDidMove || e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      mv2.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      mv2.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mv2, camera);
      const hits = ray.intersectObjects([...sqMeshes.flat(), ...Object.values(PM)], true);
      const sq = getSquareFromHit(hits); if (sq) handleClick(sq[0], sq[1]);
    };
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd);

    window._battleChessReset = () => {
      aiPendingRef.current = false; animatingRef.current = false; gsRef.current = initGame(); spawnAll(gsRef.current.board); clearHL();
      setMsg("TURN_W"); setCaps({ w: [], b: [] }); setMoveCount(0); setThinking(false); setMoveLog([]); setPromoModal(null);
      historyRef.current = []; pendingLogRef.current = { w: null, b: null };
    };

    window._battleChessMenuStart = (cfg) => {
      if (cfg) {
        if (cfg.mode) { modeRef.current = cfg.mode; setModeFixed(cfg.mode); }
        if (cfg.diff) { diffRef.current = cfg.diff; setDiffFixed(cfg.diff); }
        if (cfg.side) {
          playerSideRef.current = cfg.side;
          setPlayerSide(cfg.side);
          // Set camera behind the chosen side
          if (cfg.side === B) {
            camState.current.targetTheta = Math.PI;
            camState.current.theta = Math.PI;
          } else {
            camState.current.targetTheta = 0;
            camState.current.theta = 0;
          }
        }
        window._battleChessReset?.();
        if (modeRef.current === "ai" && playerSideRef.current === B) doAITurn();
        // AI vs AI spectator loop
        if (modeRef.current === "ai_vs_ai") {
          const spectatorLoop = async () => {
            await new Promise(r => setTimeout(r, 1000));
            while (gsRef.current.status === "playing" || gsRef.current.status === "check") {
              if (!gameStartedRef.current) break;
              aiPendingRef.current = true; setThinking(true);
              const result = await getNeuralMove(gsRef.current, "GRANDMASTER");
              setThinking(false); aiPendingRef.current = false;
              if (result && result.move) {
                executeMove(...result.move);
              } else {
                console.warn("[AI vs AI] Providers failed, stopping");
                break;
              }
              await new Promise(r => setTimeout(r, 2000));
            }
          };
          spectatorLoop();
        }

        // Online PvP: set up opponent move listener
        if (modeRef.current === "online") {
          onlineRef.current = true;
          OnlineEngine.on("opponentMove", (move) => {
            if (animatingRef.current) {
              // Queue move if currently animating
              const waitAndExec = () => {
                if (animatingRef.current) { setTimeout(waitAndExec, 100); return; }
                executeMove(move.fr, move.ff, move.tr, move.tf, move.promo || "Q");
              };
              setTimeout(waitAndExec, 100);
            } else {
              executeMove(move.fr, move.ff, move.tr, move.tf, move.promo || "Q");
            }
          });
          OnlineEngine.on("opponentLeft", () => {
            setMsg("⚔ OPPONENT DISCONNECTED");
          });
        }
      } else {
        const saved = localStorage.getItem("battleChessSave");
        if (saved) {
          try {
            const sgs = JSON.parse(saved); gsRef.current = sgs; modeRef.current = "ai"; setModeFixed("ai");
            spawnAll(gsRef.current.board); clearHL(); setMsg(statusMsg(sgs, sgs.turn === W ? B : W)); setCaps({ w: sgs.capW, b: sgs.capB });
            // If it's the AI's turn on load, kick off the AI
            if (sgs.turn !== playerSideRef.current && (sgs.status === "playing" || sgs.status === "check")) {
              setTimeout(() => doAITurn(), 500);
            }
          } catch (e) { window._battleChessReset?.(); }
        } else window._battleChessReset?.();
      }
      gameStartedRef.current = true; setGameStarted(true);
      camState.current.targetDist = 11.5;
    };

    window._battleChessExitToMenu = () => { gameStartedRef.current = false; setGameStarted(false); };
    window._battleChessUndo = () => {
      if (animatingRef.current || historyRef.current.length === 0) return;

      const undoOnce = () => {
        if (historyRef.current.length === 0) return;
        const last = historyRef.current.pop();
        gsRef.current = last;
        spawnAll(last.board);
        clearHL();
        setMsg(statusMsg(last, last.turn === W ? B : W));
        setCaps({ w: last.capW, b: last.capB });
        setMoveCount(c => Math.max(0, c - 1));
        setMoveLog(ml => {
          if (ml.length === 0) return ml;
          const lastEntry = ml[ml.length - 1];
          if (lastEntry.b === null) return ml.slice(0, -1);
          return [...ml.slice(0, -1), { ...lastEntry, b: null }];
        });
      };

      undoOnce();
      // In AI mode, undo twice to get back to player's turn
      if (modeRef.current === "ai" && historyRef.current.length > 0) {
        undoOnce();
      }

      if (modeRef.current === "ai") localStorage.setItem("battleChessSave", JSON.stringify(gsRef.current));
    };

    // Mobile: cap at 30fps to save GPU/battery
    const mobileFrameDuration = 1000 / 30;
    let lastFrameTime = 0;

    const animate = (time) => {
      if (destroyed) return; requestAnimationFrame(animate);

      // 30fps throttle on mobile
      if (isMobile) {
        if (time - lastFrameTime < mobileFrameDuration) return;
        lastFrameTime = time;
      }

      // Slow orbit in menu only — full cycle 120 seconds
      if (!gameStartedRef.current) {
        const orbitSpeed = (Math.PI * 2) / (120 * 60); // 2min at ~60fps
        camState.current.targetTheta += orbitSpeed;
      }

      // Smooth camera interpolation
      const lerpFactor = 0.1;
      camState.current.theta += (camState.current.targetTheta - camState.current.theta) * lerpFactor;
      camState.current.phi += (camState.current.targetPhi - camState.current.phi) * lerpFactor;
      camState.current.dist += (camState.current.targetDist - camState.current.dist) * lerpFactor;
      updateCam();

      if (galaxy && galaxy.tick) galaxy.tick(time);

      // In-place compaction: zero allocations, no splice GC pressure
      let writeIdx = 0;
      for (let i = 0; i < particles.length; i++) {
        if (particles[i]()) particles[writeIdx++] = particles[i];
      }
      particles.length = writeIdx;

      updateAntiqueStoneMaterials(camera);
      renderer.render(scene, camera);
    };
    animate(0);

    const onResize = () => { EW = el.clientWidth; EH = el.clientHeight; camera.aspect = EW / EH; camera.fov = camera.aspect < 1 ? 65 : 50; camera.updateProjectionMatrix(); renderer.setSize(EW, EH); };
    window.addEventListener("resize", onResize);
    // Trigger initial FOV calc for portrait phones
    onResize();
    return () => {
      destroyed = true; window.removeEventListener("resize", onResize); window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [setModeFixed, setDiffFixed]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ChessUI
        mountRef={mountRef} msg={msg} caps={caps} moveCount={moveCount} mode={mode} diff={diff} playerSide={playerSide} thinking={thinking} promoModal={promoModal}
        moveLog={moveLog} logOpen={logOpen} logRef={logRef} setModeFixed={setModeFixed} setDiffFixed={setDiffFixed} setLogOpen={setLogOpen}
        gameStarted={gameStarted} onMenuStart={handleMenuStart}
        phase1Ready={phase1Ready} allPhasesReady={allPhasesReady} phase1Progress={phase1Progress}
      />
    </div>
  );
}
