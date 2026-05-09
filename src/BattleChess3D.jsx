import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

// ── Module imports ──────────────────────────────────────────────
import { W, B, initGame, findKing, legalMoves, doMove } from "./chessEngine.js";
import { getNeuralMove } from "./aiEngine.js";
import { makePiece, preloadModels } from "./pieceFactory.js";
import { AudioEngine } from "./audioEngine.js";
import { SZ, OFF, BOARD_Y, toWorld, DARK_SQ, LIGHT_SQ, THEME, ASSET_CDN } from "./constants.js";
import ChessUI from "./ChessUI.jsx";
import { createBackground } from "./background.js";
import * as OnlineEngine from "./onlineEngine.js";
import { updateAntiqueStoneMaterials } from './antiqueStoneMaterial.js';
import { getElo, updateElo } from './eloSystem.js';
import { createProceduralBoard, loadBasementModel } from './chessBoard.js';
import { createGround } from "./ground.js";
import { mkBurst, mkShatter, animPiece as _animPiece, battleAnim as _battleAnim } from "./engine/animations.js";
import { createCameraController } from "./engine/cameraController.js";
import { createLighting, addBoardModel, createSquareMeshes } from "./engine/sceneSetup.js";

const GRAPHICS_PRESETS = {
  mobileLow: { fps: 30, maxPixelRatio: 1, antialias: true, shadows: false, powerPreference: "default" },
  mobile: { fps: 30, maxPixelRatio: 1.25, antialias: true, shadows: false, powerPreference: "default" },
  low: { fps: 45, maxPixelRatio: 1, antialias: true, shadows: false, powerPreference: "default" },
  balanced: { fps: 60, maxPixelRatio: 1.5, antialias: true, shadows: true, powerPreference: "default" },
  cinematic: { fps: 60, maxPixelRatio: 2, antialias: true, shadows: true, powerPreference: "high-performance" },
};

function chooseGraphicsPreset(isMobile) {
  let saved = null;
  try { saved = localStorage.getItem("battleChessGraphics"); } catch (e) { /* ignore storage restrictions */ }
  if (saved && GRAPHICS_PRESETS[saved]) return { name: saved, ...GRAPHICS_PRESETS[saved] };

  const memory = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const lowEndDevice =
    (typeof memory === "number" && memory <= 4) ||
    (typeof cores === "number" && cores <= 4);

  if (isMobile) return { name: lowEndDevice ? "mobileLow" : "mobile", ...GRAPHICS_PRESETS[lowEndDevice ? "mobileLow" : "mobile"] };
  if (lowEndDevice) return { name: "low", ...GRAPHICS_PRESETS.low };
  return { name: "balanced", ...GRAPHICS_PRESETS.balanced };
}

// ═══════════════════════════════════════════════════════════════
//  ORCHESTRATOR COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function BattleChess3D() {
  const mountRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  useEffect(() => { window._isGameActive = gameStarted; }, [gameStarted]);
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
  const [eloStats, setEloStats] = useState(getElo());
  const [onlineRematchState, setOnlineRematchState] = useState("none");
  const [onlineRematchTime, setOnlineRematchTime] = useState(0);
  const logRef = useRef(null);
  const onlineRematchInterval = useRef(null);

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
    dist: 14.5,
    targetTheta: 0.3,
    targetPhi: 0.55,
    targetDist: 14.5,
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
    const graphics = chooseGraphicsPreset(isMobile);
    window._battleChessGraphics = graphics.name;

    // ── Scene ───────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEME.bg);
    scene.fog = new THREE.FogExp2(THEME.bg, THEME.fogDensity);
    const camera = new THREE.PerspectiveCamera(50, EW / EH, 0.1, 500);
    const _lastCamPos = new THREE.Vector3(); // dirty flag for updateAntiqueStoneMaterials
    const renderer = new THREE.WebGLRenderer({ antialias: graphics.antialias, powerPreference: graphics.powerPreference });
    renderer.setSize(EW, EH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, graphics.maxPixelRatio));
    renderer.shadowMap.enabled = graphics.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1; // Reduced from 1.5 - stops washing out greys to white
    el.appendChild(renderer.domElement);

    // ── WebGL context loss recovery ────────────────────────────
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      destroyed = true;
    }, false);
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      window.location.reload();
    }, false);

    // ── Galaxy (PC only) ─────────────────────────────────────────
    const background = isMobile ? null : createBackground(scene);

    // ── Lights (from engine/sceneSetup.js) ──────────────────
    createLighting(scene, isMobile, graphics);


    // ── Board (Phased Loading) ────────────────────────────────────
    const boardGrp = new THREE.Group();
    scene.add(boardGrp);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    gltfLoader.setDRACOLoader(dracoLoader);

    // ── Board model loading (from engine/sceneSetup.js) ───────


    // Phase 1: board + ground + figures + walls + audio
    const phase1Total = 6;
    let phase1Loaded = 0;
    let scenePhasesReady = false;
    const phase1tick = () => { phase1Loaded++; setPhase1Progress(phase1Loaded / phase1Total); };

    const boardGroup = createProceduralBoard(scene);
    boardGroup.position.y = BOARD_Y;
    scene.add(boardGroup);

    // Delay heavy GLB loading until splash is done — avoids CPU/bandwidth competition
    const startLoading = () => {
      const p1Board = Promise.resolve(); phase1tick();
      createGround(scene);
      const p1Ground = Promise.resolve(); phase1tick();
      const p1Walls = new Promise((res, rej) => gltfLoader.load(`${ASSET_CDN}/walls.glb`, g => {
        addBoardModel(g, boardGrp, isMobile, true, 0.67);
        // traverse boardGrp — последний добавленный child это walls
        const wallsModel = boardGrp.children[boardGrp.children.length - 1];
        wallsModel.traverse(node => {
          if (!node.isMesh) return;
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach(m => {
            // Match basement color #656F6B (0.39, 0.43, 0.41) but darkened for bg
            m.color.setRGB(0.16, 0.18, 0.17);
            m.roughness = 0.95;
            m.metalness = 0.00;
            if (m.emissive) m.emissive.setHex(0x000000);
            m.needsUpdate = true;
          });
        });
        phase1tick();
        res();
      }, undefined, rej));
      const p1Basement = loadBasementModel(scene).then(() => phase1tick());
      const p1Figures = preloadModels().then(() => phase1tick());
      const p1Audio = AudioEngine.preload().then(() => phase1tick());
      Promise.all([p1Board, p1Ground, p1Walls, p1Basement, p1Figures, p1Audio]).then(() => {
        scenePhasesReady = true;
        setPhase1Ready(true);
        setAllPhasesReady(true);
      });
    };
    setTimeout(startLoading, 7200);

    const sqMeshes = createSquareMeshes(boardGrp, SZ, toWorld);


    const PM = {};
    function spawnAll(board) {
      Object.values(PM).forEach(m => {
        if (!m) return;
        scene.remove(m);
        m.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); } });
      });
      for (const k in PM) delete PM[k];
      for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++) {
          const p = board[r][f];
          if (p) {
            const m = makePiece(p.t, p.c);
            const pos = toWorld(r, f);
            m.position.set(pos.x, pos.y, pos.z);
            if (p.c === W) m.rotation.y = Math.PI;
            m.userData = { ...m.userData, r, f };
            scene.add(m); PM[`${r},${f}`] = m;
          }
        }
      refreshRaycastTargets();
    }

    const particles = [];
    // ── Animation wrappers (delegate to engine/animations.js) ──
    const animCtx = { scene, particles, camState, animatingRef };
    function animPiece(mesh, target, duration, cb) { _animPiece(mesh, target, duration, animatingRef, cb); }
    function battleAnim(attacker, victim, target, col, cb) { _battleAnim(animCtx, attacker, victim, target, col, BOARD_Y, cb); }

    // ── Piece outline on selection (inverted hull technique) ────
    let outlineMeshes = []; // cloned outline shells
    const OUTLINE_MAT = new THREE.MeshBasicMaterial({
      color: 0xc5a059, side: THREE.BackSide,
      transparent: true, opacity: 0.7,
      depthWrite: false,
    });
    const OUTLINE_SCALE = 1.08; // 8% larger than original

    function setOutline(group) {
      clearOutline();
      if (!group) return;
      group.traverse((child) => {
        if (!child.isMesh || !child.geometry) return;
        const outline = new THREE.Mesh(child.geometry, OUTLINE_MAT);
        // Copy world transform from the original mesh
        child.updateWorldMatrix(true, false);
        outline.applyMatrix4(child.matrixWorld);
        outline.scale.multiplyScalar(OUTLINE_SCALE);
        outline.renderOrder = -1;
        scene.add(outline);
        outlineMeshes.push(outline);
      });
    }

    function clearOutline() {
      for (const m of outlineMeshes) scene.remove(m);
      outlineMeshes = [];
    }

    // Pre-flatten for clearHL performance (avoid .flat() per call)
    const flatSqMeshes = sqMeshes.flat();
    const raycastTargets = [...flatSqMeshes];
    function refreshRaycastTargets() {
      raycastTargets.length = flatSqMeshes.length;
      Object.values(PM).forEach(m => raycastTargets.push(m));
    }

    function clearHL() {
      flatSqMeshes.forEach(m => { m.userData.mat.opacity = 0; m.userData.mat.visible = false; });
      clearOutline();
    }

    function showHL(sel, moves, last, checkC, board) {
      clearHL();

      if (sel) {
        const [r, f] = sel;
        // Outline the selected piece
        const key = `${r},${f}`;
        if (PM[key]) setOutline(PM[key]);
      }

      // Removed the DOM_POOL / RING_POOL iteration here per user request for a cleaner look.

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
      // Play capture or move SFX
      const isCapture = g.board[tr][tf] || (piece.t === "P" && g.ep && tr === g.ep[0] && tf === g.ep[1]);
      if (isCapture) AudioEngine.capture(); else AudioEngine.move();
      const fk = `${fr},${ff}`, tk = `${tr},${tf}`, tPos = toWorld(tr, tf);
      const movMesh = PM[fk], capMesh = PM[tk];
      const wasEP = piece.t === "P" && g.ep && tr === g.ep[0] && tf === g.ep[1];
      const wasCastle = piece.t === "K" && Math.abs(tf - ff) === 2;
      const ngs = doMove(g, fr, ff, tr, tf, isPawnPromo ? chosenPromo : "Q");
      const castleRookFromKey = wasCastle ? `${fr},${tf === 6 ? 7 : 0}` : null;
      const castleRookToPos = wasCastle ? toWorld(fr, tf === 6 ? 5 : 3) : null;
      const castleRookToKey = wasCastle ? `${fr},${tf === 6 ? 5 : 3}` : null;
      const afterAnim = () => {
        historyRef.current.push(structuredClone(g));
        delete PM[fk];
        if (isPawnPromo) {
          scene.remove(movMesh); const newM = makePiece(chosenPromo, piece.c);
          newM.position.set(tPos.x, tPos.y, tPos.z); newM.userData = { type: chosenPromo, color: piece.c, r: tr, f: tf };
          scene.add(newM); PM[tk] = newM;
          particles.push(mkBurst({ x: tPos.x, y: tPos.y + 0.3, z: tPos.z }, piece.c === W ? THEME.whiteAccent : THEME.blackAccent, 0.1, 120));
        } else { PM[tk] = movMesh; movMesh.userData = { ...movMesh.userData, r: tr, f: tf }; }
        if (wasCastle) {
          const rkM = PM[castleRookFromKey];
          if (rkM) { delete PM[castleRookFromKey]; animPiece(rkM, castleRookToPos, 0.32, () => { PM[castleRookToKey] = rkM; rkM.userData = { ...rkM.userData, r: fr, f: tf === 6 ? 5 : 3 }; finish(); }); }
          else finish();
        } else finish();
      };
      const finish = () => {
        gsRef.current = { ...ngs, sel: null, lm: [] }; animatingRef.current = false;
        refreshRaycastTargets();
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
        if (modeRef.current === "pvp") localStorage.setItem("battleChessSave", JSON.stringify(ngs));
        // Online PvP: send move to opponent
        if (modeRef.current === "online" && onlineRef.current && piece.c === playerSideRef.current) {
          OnlineEngine.sendMove(fr, ff, tr, tf, isPawnPromo ? chosenPromo : "Q");
        }

        // Online 15-second mutual rematch timeout
        if (modeRef.current === "online" && (ngs.status === "checkmate" || ngs.status === "stalemate")) {
          setOnlineRematchTime(15);
          if (onlineRematchInterval.current) clearInterval(onlineRematchInterval.current);
          onlineRematchInterval.current = setInterval(() => {
            setOnlineRematchTime(t => {
              if (t <= 1) {
                clearInterval(onlineRematchInterval.current);
                window._battleChessExitToMenu?.();
                return 0;
              }
              return t - 1;
            });
          }, 1000);
        }

        console.log("[finish] mode:", modeRef.current, "turn:", ngs.turn, "playerSide:", playerSideRef.current, "status:", ngs.status, "aiPending:", aiPendingRef.current, "animating:", animatingRef.current);
        // Win/Lose SFX on game end
        if (ngs.status === "checkmate") {
          const playerWon = ngs.turn !== playerSideRef.current;
          if (modeRef.current === "pvp" || modeRef.current === "online") AudioEngine.win(); // PvP: someone won
          else if (playerWon) AudioEngine.win(); else AudioEngine.lose();
        }
        // ELO update on game end (AI mode only)
        if (modeRef.current === "ai" && (ngs.status === "checkmate" || ngs.status === "stalemate")) {
          let result;
          if (ngs.status === "stalemate") result = 'draw';
          else result = ngs.turn === playerSideRef.current ? 'loss' : 'win'; // checkmate: loser's turn
          updateElo(result, diffRef.current);
          setEloStats(getElo());
        }
        if (modeRef.current === "ai" && ngs.turn !== playerSideRef.current && (ngs.status === "playing" || ngs.status === "check")) doAITurn();
      };
      if (wasEP) {
        const epK = `${fr},${tf}`;
        if (PM[epK]) { const ep = toWorld(fr, tf); particles.push(mkBurst({ x: ep.x, y: ep.y + 0.3, z: ep.z }, THEME.whiteAccent)); scene.remove(PM[epK]); delete PM[epK]; }
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

    // ── Camera & Input (from engine/cameraController.js) ──────────
    const camController = createCameraController({
      camera, renderer, scene, camState, gameStartedRef, BOARD_Y, raycastTargets, handleClick
    });
    const { updateCam } = camController;


    window._battleChessReset = () => {
      if (onlineRematchInterval.current) { clearInterval(onlineRematchInterval.current); onlineRematchInterval.current = null; }
      setOnlineRematchState("none"); setOnlineRematchTime(0);
      aiPendingRef.current = false; animatingRef.current = false; gsRef.current = initGame(); spawnAll(gsRef.current.board); clearHL();
      setMsg("TURN_W"); setCaps({ w: [], b: [] }); setMoveCount(0); setThinking(false); setMoveLog([]); setPromoModal(null);
      historyRef.current = []; pendingLogRef.current = { w: null, b: null };
    };

    // ── Live skin reload (called from Treasury panel) ──────────
    window._battleChessReloadPieces = () => {
      preloadModels().then(() => spawnAll(gsRef.current.board));
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
        // Switch BGM: menu → game
        AudioEngine.playBGM("game");
        window._battleChessReset?.();

        // Fast-forward mid-game sync (Spectators)
        if (cfg.moveHistory && cfg.moveHistory.length > 0) {
          let state = gsRef.current;
          const newLog = [];
          for (let m of cfg.moveHistory) {
            state = doMove(state, m.fr, m.ff, m.tr, m.tf, m.promo || "Q");
            newLog.push(state.last.note);
          }
          gsRef.current = state;
          spawnAll(state.board);
          setMoveLog(newLog);
          setMoveCount(newLog.length);
          setMsg(state.status === "playing" ? (state.turn === "w" ? "TURN_W" : "TURN_B") : (state.turn === "w" ? "MATE_B" : "MATE_W"));
          setCaps({ w: state.capW, b: state.capB });
        } else if (modeRef.current === "ai" && playerSideRef.current === B) {
          doAITurn();
        }
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
          OnlineEngine.on("rematch", () => {
            setOnlineRematchState(prev => {
              if (prev === "requested_by_me") {
                const cfg = { mode: modeRef.current, diff: diffRef.current, side: playerSideRef.current === W ? 'w' : 'b' };
                setTimeout(() => window._battleChessMenuStart?.(cfg), 10);
                return "none";
              }
              return "requested_by_op";
            });
          });
        }
      } else {
        const saved = localStorage.getItem("battleChessSave");
        if (saved) {
          try {
            const sgs = JSON.parse(saved); gsRef.current = sgs; modeRef.current = "pvp"; setModeFixed("pvp");
            spawnAll(gsRef.current.board); clearHL(); setMsg(statusMsg(sgs, sgs.turn === W ? B : W)); setCaps({ w: sgs.capW, b: sgs.capB });
            // If it's the AI's turn on load, kick off the AI
            if (sgs.turn !== playerSideRef.current && (sgs.status === "playing" || sgs.status === "check")) {
              setTimeout(() => doAITurn(), 500);
            }
          } catch (e) { window._battleChessReset?.(); }
        } else window._battleChessReset?.();
      }
      gameStartedRef.current = true; setGameStarted(true);
      camState.current.targetDist = 14.5;
      // Orientation lock (landscape) — mobile only, silently fails on unsupported platforms
      try { screen.orientation?.lock?.('landscape').catch(() => { }); } catch (e) { }
    };

    window._battleChessRematch = () => {
      setOnlineRematchState(currState => {
        if (modeRef.current === "online") {
          if (currState === "requested_by_op") {
            const cfg = { mode: modeRef.current, diff: diffRef.current, side: playerSideRef.current === W ? 'w' : 'b' };
            setTimeout(() => window._battleChessMenuStart?.(cfg), 10);
            return "none";
          } else {
            OnlineEngine.sendRematch();
            return "requested_by_me";
          }
        }
        return currState;
      });
      if (modeRef.current !== "online") {
        const cfg = { mode: modeRef.current, diff: diffRef.current, side: playerSideRef.current === W ? 'w' : 'b' };
        window._battleChessMenuStart?.(cfg);
      }
    };

    window._battleChessAbandonMatch = () => {
      if (modeRef.current === "ai" && gsRef.current && gsRef.current.status === "playing") {
        updateElo("loss", diffRef.current);
        gsRef.current.status = "abandoned";
        setEloStats(getElo());
      }
    };

    window._battleChessExitToMenu = () => {
      if (onlineRematchInterval.current) { clearInterval(onlineRematchInterval.current); onlineRematchInterval.current = null; }
      setOnlineRematchState("none"); setOnlineRematchTime(0);
      gameStartedRef.current = false; setGameStarted(false);
      try { screen.orientation?.unlock?.(); } catch (e) { }
      if (modeRef.current === "online") OnlineEngine.disconnect();
    };

    const handleBeforeUnload = () => {
      window._battleChessAbandonMatch?.();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

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

      if (modeRef.current === "pvp") localStorage.setItem("battleChessSave", JSON.stringify(gsRef.current));
    };

    const frameDuration = 1000 / graphics.fps;
    let lastFrameTime = 0;

    const animate = (time) => {
      if (destroyed) return; requestAnimationFrame(animate);

      if (time - lastFrameTime < frameDuration - 0.5) return;
      lastFrameTime = time;

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

      // PERFORMANCE FIX #1: Only tick background if game is active or menu is visible
      if (gameStartedRef.current || !scenePhasesReady) {
        if (background && background.tick) background.tick(time);
      }

      // Pulsing outline on selected piece
      if (outlineMeshes.length > 0) {
        const pulse = 0.5 + Math.sin(time * 0.004) * 0.3;
        OUTLINE_MAT.opacity = pulse;
      }

      // In-place compaction: zero allocations, no splice GC pressure
      let writeIdx = 0;
      for (let i = 0; i < particles.length; i++) {
        if (particles[i]()) particles[writeIdx++] = particles[i];
      }
      particles.length = writeIdx;

      // Dirty flag: only update antique stone uniforms when camera actually moves
      if (!camera.position.equals(_lastCamPos)) {
        updateAntiqueStoneMaterials(camera);
        _lastCamPos.copy(camera.position);
      }
      renderer.render(scene, camera);
    };
    animate(0);
    const nativePixelRatio = Math.min(window.devicePixelRatio, graphics.maxPixelRatio);
    const getResCap = () => {
      try { const r = localStorage.getItem('battleChessRes'); if (r) return JSON.parse(r); } catch (e) { }
      return null; // null = native
    };
    const onResize = () => {
      EW = el.clientWidth; EH = el.clientHeight;
      const cap = getResCap();
      if (cap) {
        // Force pixel ratio to 1 and render at exact capped resolution
        renderer.setPixelRatio(1);
        const rw = Math.min(cap[0], EW);
        const rh = Math.min(cap[1], EH);
        camera.aspect = rw / rh; camera.fov = camera.aspect < 1 ? 65 : 50;
        camera.updateProjectionMatrix(); renderer.setSize(rw, rh, false);
      } else {
        // Native: use full device resolution with DPR
        renderer.setPixelRatio(nativePixelRatio);
        camera.aspect = EW / EH; camera.fov = camera.aspect < 1 ? 65 : 50;
        camera.updateProjectionMatrix(); renderer.setSize(EW, EH, false);
      }
      renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    };
    window._battleChessSetResolution = (res) => {
      if (res) localStorage.setItem('battleChessRes', JSON.stringify(res));
      else localStorage.removeItem('battleChessRes');
      onResize();
    };
    window.addEventListener("resize", onResize);
    // Trigger initial FOV calc for portrait phones
    onResize();
    return () => {
      destroyed = true; window.removeEventListener("resize", onResize); camController.cleanup();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      renderer.dispose();
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
        eloStats={eloStats} onlineRematchState={onlineRematchState} onlineRematchTime={onlineRematchTime}
      />
    </div>
  );
}
