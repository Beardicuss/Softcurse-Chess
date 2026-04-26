import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// ── Module imports ──────────────────────────────────────────────
import { W, B, initGame, findKing, legalMoves, doMove } from "./chessEngine.js";
import { getBestMove } from "./aiEngine.js";
import { makePiece } from "./pieceFactory.js";
import { AudioEngine } from "./audioEngine.js";
import { SZ, OFF, toWorld, DARK_SQ, LIGHT_SQ, DIFF_MAP, THEME } from "./constants.js";
import ChessUI from "./ChessUI.jsx";
import { createGalaxyBackground } from "./galaxyBackground.js";

// ═══════════════════════════════════════════════════════════════
//  ORCHESTRATOR COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function BattleChess3D() {
  const mountRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [msg, setMsg] = useState("⚔  WHITE'S TURN");
  const [caps, setCaps] = useState({ w: [], b: [] });
  const [moveCount, setMoveCount] = useState(0);
  const [mode, setMode] = useState("pvp");
  const [diff, setDiff] = useState("SOLDIER");
  const [thinking, setThinking] = useState(false);
  const [promoModal, setPromoModal] = useState(null);
  const [moveLog, setMoveLog] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const logRef = useRef(null);

  // ── Stable refs ───────────────────────────────────────────────
  const gameStartedRef = useRef(false);
  const modeRef = useRef("pvp");
  const diffRef = useRef("SOLDIER");
  const historyRef = useRef([]);
  const pendingLogRef = useRef({ w: null, b: null });
  const animatingRef = useRef(false);
  const aiPendingRef = useRef(false);

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

    // ── Scene ───────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEME.bg);
    scene.fog = new THREE.FogExp2(THEME.bg, THEME.fogDensity);
    const camera = new THREE.PerspectiveCamera(50, EW / EH, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(EW, EH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.4;
    el.appendChild(renderer.domElement);

    // Environment Map (IBL) for PBR Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.0).texture;

    // ── Galaxy Background ─────────────────────────────────────────
    const galaxy = createGalaxyBackground(scene);

    // ── Lights ───────────────────────────────────────────────────
    // Strong ambient so dark textures are visible
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    // Main key light
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    // Fill light from opposite side
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight2.position.set(-5, 8, -5);
    scene.add(dirLight2);

    // Accent point light (animated in loop)
    const accentPt = new THREE.PointLight(0x6080ff, 0.6, 20);
    accentPt.position.set(-3, 5, -3);
    scene.add(accentPt);

    // Warm rim for angels side
    const rimW = new THREE.DirectionalLight(0xffaa44, 1.5);
    rimW.position.set(0, 4, -8);
    scene.add(rimW);

    // Cool rim for daemons side
    const rimB = new THREE.DirectionalLight(0x88aaff, 1.0);
    rimB.position.set(0, 3, 8);
    scene.add(rimB);

    // ── Board ────────────────────────────────────────────────────
    const boardGrp = new THREE.Group();
    scene.add(boardGrp);

    // ── Utility: canvas texture factory ─────────────────────────
    function makeCanvasTex(w, h, draw) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      draw(c.getContext("2d"), w, h);
      const t = new THREE.CanvasTexture(c);
      return t;
    }

    // ── Dark tile texture: cracked obsidian with rune veins ──────
    const darkTileTex = makeCanvasTex(256, 256, (ctx, W, H) => {
      ctx.fillStyle = "#05040e";
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 3200; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        const b = Math.floor(Math.random() * 28 + 4);
        ctx.fillStyle = `rgb(${b},${b},${Math.floor(b * 1.6)})`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.strokeStyle = "rgba(180,40,10,0.55)";
      ctx.lineWidth = 0.8;
      const cracks = [
        [[30, 10], [80, 60], [120, 55], [160, 110]],
        [[200, 20], [170, 80], [210, 130], [190, 200]],
        [[10, 180], [70, 160], [100, 200], [140, 220]],
        [[220, 220], [180, 180], [230, 150]],
        [[90, 90], [130, 70], [150, 120]],
      ];
      cracks.forEach(pts => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,80,20,0.18)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
        ctx.strokeStyle = "rgba(180,40,10,0.55)";
        ctx.lineWidth = 0.8;
      });
      ctx.strokeStyle = "rgba(60,20,180,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(128, 128, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = 128 + Math.cos(a) * 40, y = 128 + Math.sin(a) * 40;
        const a2 = ((i + 2) / 6) * Math.PI * 2;
        const x2 = 128 + Math.cos(a2) * 40, y2 = 128 + Math.sin(a2) * 40;
        ctx.moveTo(x, y); ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    });

    // ── Light tile texture: scorched amber stone ─────────────────
    const lightTileTex = makeCanvasTex(256, 256, (ctx, W, H) => {
      const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 160);
      grad.addColorStop(0, "#c8820e");
      grad.addColorStop(0.5, "#a06210");
      grad.addColorStop(1, "#6b3e08");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        const a = Math.random() * 0.12;
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 80},${Math.floor(Math.random() * 40 + 20)},0,${a})`;
        ctx.fillRect(x, y, Math.random() * 3, 1);
      }
      for (let i = 0; i < 5; i++) {
        const bx = Math.random() * W, by = Math.random() * H, br = Math.random() * 30 + 10;
        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        bg.addColorStop(0, "rgba(10,5,0,0.45)");
        bg.addColorStop(1, "rgba(10,5,0,0)");
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,100,10,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 220); ctx.lineTo(80, 160); ctx.lineTo(140, 180); ctx.lineTo(200, 120);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,160,30,0.25)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, 220); ctx.lineTo(80, 160); ctx.lineTo(140, 180); ctx.lineTo(200, 120);
      ctx.stroke();
    });

    // ── Emissive crack map for dark tiles ────────────────────────
    const darkEmissiveTex = makeCanvasTex(256, 256, (ctx, W, H) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,70,10,1)";
      ctx.lineWidth = 1.2;
      const cracks = [
        [[30, 10], [80, 60], [120, 55], [160, 110]],
        [[200, 20], [170, 80], [210, 130], [190, 200]],
        [[10, 180], [70, 160], [100, 200], [140, 220]],
        [[220, 220], [180, 180], [230, 150]],
        [[90, 90], [130, 70], [150, 120]],
      ];
      cracks.forEach(pts => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      });
    });

    // ── Border frame texture: iron with bone inlay ───────────────
    const borderTex = makeCanvasTex(512, 64, (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#2a2a2a");
      g.addColorStop(0.4, "#1a1a1a");
      g.addColorStop(0.6, "#111");
      g.addColorStop(1, "#222");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (let x = 24; x < W; x += 48) {
        const rg = ctx.createRadialGradient(x, H / 2, 0, x, H / 2, 7);
        rg.addColorStop(0, "#888"); rg.addColorStop(1, "#333");
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(x, H / 2, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "rgba(220,210,190,0.08)";
      ctx.fillRect(0, H * 0.3, W, H * 0.4);
      ctx.strokeStyle = "rgba(180,40,10,0.35)";
      ctx.lineWidth = 0.7;
      for (let x = 12; x < W; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, H * 0.2); ctx.lineTo(x + 6, H * 0.5); ctx.lineTo(x, H * 0.8);
        ctx.moveTo(x + 12, H * 0.2); ctx.lineTo(x + 6, H * 0.5); ctx.lineTo(x + 12, H * 0.8);
        ctx.stroke();
      }
    });

    // ── Materials ────────────────────────────────────────────────
    const darkSqMat = new THREE.MeshStandardMaterial({
      color: 0x0a0010,
      roughness: 0.9,
      metalness: 0.1,
      emissive: new THREE.Color(0x330008),
      emissiveIntensity: 0.6,
    });

    const lightSqMat = new THREE.MeshStandardMaterial({
      color: 0x8b1a1a,
      roughness: 0.8,
      metalness: 0.2,
      emissive: new THREE.Color(0x440000),
      emissiveIntensity: 0.5,
    });

    // ── Base terrain slab ────────────────────────────────────────
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x050508,
      metalness: 0.05,
      roughness: 0.95,
      emissive: new THREE.Color(0x110402),
      emissiveIntensity: 0.4,
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.32, 11.6), slabMat);
    slab.position.y = -0.16;
    slab.receiveShadow = true;
    slab.castShadow = true;
    boardGrp.add(slab);

    const subSlabMat = new THREE.MeshStandardMaterial({
      color: 0x030204,
      roughness: 0.9,
      metalness: 0.2,
    });
    const subSlab = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.14, 12.2), subSlabMat);
    subSlab.position.y = -0.38;
    subSlab.receiveShadow = true;
    boardGrp.add(subSlab);

    // ── Lava underglow — hellfire beneath the board ──────────────
    const glowLight = new THREE.PointLight(0xff2200, 3.5, 12);
    glowLight.position.set(0, -0.9, 0);
    boardGrp.add(glowLight);

    const glowLight2 = new THREE.PointLight(0xff6600, 1.5, 8);
    glowLight2.position.set(3, -0.6, 3);
    boardGrp.add(glowLight2);

    const glowLight3 = new THREE.PointLight(0xaa0022, 1.2, 8);
    glowLight3.position.set(-3, -0.6, -3);
    boardGrp.add(glowLight3);

    // ── Border frame — iron + bone construction ──────────────────
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
      metalness: 0.9,
      emissive: new THREE.Color(0x0a0204),
      emissiveIntensity: 0.3,
    });

    const bW = 11.6, bH = 0.28, bD = 0.62;
    const borderDefs = [
      { pos: [0, 0.02, -5.61], rot: [0, 0, 0], w: bW, h: bH, d: bD },
      { pos: [0, 0.02, 5.61], rot: [0, Math.PI, 0], w: bW, h: bH, d: bD },
      { pos: [-5.61, 0.02, 0], rot: [0, Math.PI / 2, 0], w: bW, h: bH, d: bD },
      { pos: [5.61, 0.02, 0], rot: [0, -Math.PI / 2, 0], w: bW, h: bH, d: bD },
    ];
    borderDefs.forEach(({ pos, rot, w, h, d }) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), borderMat);
      m.position.set(...pos);
      m.rotation.set(...rot);
      m.castShadow = true;
      boardGrp.add(m);
    });

    // ── Corner pillars — broken cathedral columns ────────────────
    function makePillar(x, z) {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x111115, roughness: 0.6, metalness: 0.7,
        emissive: new THREE.Color(0x220500), emissiveIntensity: 0.5,
      });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.22, 8), baseMat);
      base.position.y = 0.11; base.castShadow = true;
      grp.add(base);

      const shaftMat = new THREE.MeshStandardMaterial({
        color: 0x0e0c14, roughness: 0.75, metalness: 0.5,
        emissive: new THREE.Color(0x1a0200), emissiveIntensity: 0.4,
      });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.1, 7), shaftMat);
      shaft.position.y = 0.77; shaft.castShadow = true;
      grp.add(shaft);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.22, 0.18, 8), baseMat);
      cap.position.y = 1.42; cap.castShadow = true;
      grp.add(cap);

      const spikeMat = new THREE.MeshStandardMaterial({
        color: 0xe8d8b0, roughness: 0.6, metalness: 0.1,
        emissive: new THREE.Color(0x330800), emissiveIntensity: 0.2,
      });
      [0, Math.PI * 2 / 3, Math.PI * 4 / 3].forEach(a => {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.38, 5), spikeMat);
        spike.position.set(Math.cos(a) * 0.2, 1.71, Math.sin(a) * 0.2);
        spike.castShadow = true;
        grp.add(spike);
      });

      const mainSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.55, 5), spikeMat);
      mainSpike.position.y = 1.84; mainSpike.castShadow = true;
      grp.add(mainSpike);

      const fire = new THREE.PointLight(0xff0000, 2.2, 5);
      fire.position.y = 2.1;
      grp.userData.fireLight = fire;
      grp.add(fire);

      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xff1100, emissive: new THREE.Color(0xff2200),
        emissiveIntensity: 5.0, roughness: 1.0, metalness: 0.0,
        transparent: true, opacity: 0.85,
      });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), flameMat);
      flame.position.y = 2.08;
      grp.userData.flameGem = flame;
      grp.add(flame);

      const chainMat = new THREE.MeshStandardMaterial({ color: 0x3a3030, roughness: 0.8, metalness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const ca = (i / 3) * Math.PI * 2 + 0.4;
        for (let j = 0; j < 4; j++) {
          const link = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 6), chainMat);
          link.position.set(Math.cos(ca) * 0.15, 1.25 - j * 0.11, Math.sin(ca) * 0.15);
          link.rotation.x = (j % 2) * Math.PI / 2;
          grp.add(link);
        }
      }

      boardGrp.add(grp);
      return grp;
    }

    const pillarPositions = [[-5.5, -5.5], [-5.5, 5.5], [5.5, -5.5], [5.5, 5.5]];
    const pillars = pillarPositions.map(([x, z]) => makePillar(x, z));

    // ── Spike rail between pillars — border spikes ───────────────
    const spikeMat2 = new THREE.MeshStandardMaterial({
      color: 0x1a1622, roughness: 0.5, metalness: 0.95,
      emissive: new THREE.Color(0x0a0005), emissiveIntensity: 0.2,
    });
    const railSides = [
      { axis: "z", sign: -1, xRange: [-4.5, 4.5] },
      { axis: "z", sign: 1, xRange: [-4.5, 4.5] },
      { axis: "x", sign: -1, xRange: [-4.5, 4.5] },
      { axis: "x", sign: 1, xRange: [-4.5, 4.5] },
    ];
    railSides.forEach(({ axis, sign, xRange }) => {
      for (let p = xRange[0]; p <= xRange[1]; p += 1.1) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.28, 5), spikeMat2);
        if (axis === "z") spike.position.set(p, 0.35, sign * 5.61);
        else spike.position.set(sign * 5.61, 0.35, p);
        spike.castShadow = true;
        boardGrp.add(spike);
      }
    });

    // ── Fog plane — ground-level hellsmoke ───────────────────────
    const fogPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x110002, transparent: true, opacity: 0.55,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const fogPlane = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), fogPlaneMat);
    fogPlane.rotation.x = -Math.PI / 2;
    fogPlane.position.y = -0.5;
    boardGrp.add(fogPlane);

    // ── Grid lines — blood-red, thin ─────────────────────────────
    const glm = new THREE.LineBasicMaterial({
      color: 0x660010, transparent: true, opacity: 0.3,
    });
    for (let i = 0; i <= 8; i++) {
      const x = i * SZ + OFF - SZ / 2;
      boardGrp.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, 0.008, OFF - SZ / 2),
          new THREE.Vector3(x, 0.008, OFF + 8 * SZ - SZ / 2),
        ]), glm));
    }
    for (let i = 0; i <= 8; i++) {
      const z = i * SZ + OFF - SZ / 2;
      boardGrp.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(OFF - SZ / 2, 0.008, z),
          new THREE.Vector3(OFF + 8 * SZ - SZ / 2, 0.008, z),
        ]), glm));
    }

    // ── 64 Chess squares ─────────────────────────────────────────
    const sqMeshes = [];
    for (let r = 0; r < 8; r++) {
      sqMeshes[r] = [];
      for (let f = 0; f < 8; f++) {
        const isDark = (r + f) % 2 === 1;
        const mat = (isDark ? darkSqMat : lightSqMat).clone();
        const m = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), mat);
        const pos = toWorld(r, f);
        m.rotation.x = -Math.PI / 2;
        m.position.set(pos.x, 0.001, pos.z);
        m.receiveShadow = true;
        m.userData = { r, f, isDark, mat };
        boardGrp.add(m);
        sqMeshes[r][f] = m;
      }
    }

    // ── Piece mesh map ──────────────────────────────────────────
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
            m.position.set(pos.x, 0.05, pos.z);
            if (p.c === W) m.rotation.y = Math.PI; // Face the opposing side
            m.userData = { ...m.userData, r, f };
            scene.add(m); PM[`${r},${f}`] = m;
          }
        }
    }

    // ── Particles ────────────────────────────────────────────────
    const particles = [];
    function mkBurst(pos, col, sz = 0.07, N = 90) {
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(N * 3);
      const vel = Array.from({ length: N }, () =>
        new THREE.Vector3((Math.random() - 0.5) * 0.22, Math.random() * 0.22 + 0.05, (Math.random() - 0.5) * 0.22));
      for (let i = 0; i < N; i++) { arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y + 0.3; arr[i * 3 + 2] = pos.z; }
      geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.PointsMaterial({ color: col, size: sz, transparent: true, opacity: 1 });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts); let life = 0;
      return () => {
        life += 0.04;
        const p = geo.attributes.position.array;
        for (let i = 0; i < N; i++) {
          vel[i].y -= 0.006;
          p[i * 3] += vel[i].x; p[i * 3 + 1] += vel[i].y; p[i * 3 + 2] += vel[i].z;
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - life / 1.6);
        if (life >= 1.6) { scene.remove(pts); return false; }
        return true;
      };
    }

    // ── Highlights ───────────────────────────────────────────────
    const hlMeshes = [];
    function clearHL() {
      hlMeshes.forEach(m => scene.remove(m));
      hlMeshes.length = 0;
      for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++) {
          const { isDark, mat } = sqMeshes[r][f].userData;
          mat.color.setHex(isDark ? 0x05050f : 0xb07a18);
          if (mat.emissive) mat.emissive.setHex(isDark ? 0x000000 : 0x1a0e00);
          mat.emissiveIntensity = isDark ? 0 : 0.2;
        }
    }
    function showHL(sel, moves, last, chkC, board) {
      clearHL();
      if (last) {
        [[last.fr, last.ff], [last.tr, last.tf]].forEach(([r, f]) =>
          sqMeshes[r][f].userData.mat.color.set(0x331822));
      }
      if (chkC) {
        const k = findKing(board, chkC);
        if (k) sqMeshes[k[0]][k[1]].userData.mat.color.set(0x880022);
      }
      if (sel) sqMeshes[sel[0]][sel[1]].userData.mat.color.set(0x401030);
      moves.forEach(([r, f]) => {
        const hasP = !!board[r][f];
        const geo = hasP ? new THREE.RingGeometry(0.3, 0.44, 24) : new THREE.CircleGeometry(0.18, 20);
        const mat = new THREE.MeshBasicMaterial({ color: 0xc5a059, transparent: true, opacity: 0.78, side: THREE.DoubleSide });
        const dot = new THREE.Mesh(geo, mat);
        const p2 = toWorld(r, f);
        dot.position.set(p2.x, 0.08, p2.z); dot.rotation.x = -Math.PI / 2;
        scene.add(dot); hlMeshes.push(dot);
      });
    }

    // ── Arc animation ────────────────────────────────────────────
    function animPiece(mesh, target, dur, done) {
      const sx = mesh.position.x, sz = mesh.position.z;
      const ex = target.x, ez = target.z;
      let t = 0;
      const tick = () => {
        if (destroyed) return;
        t += 0.016 / dur; if (t > 1) t = 1;
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        mesh.position.x = sx + (ex - sx) * e;
        mesh.position.z = sz + (ez - sz) * e;
        mesh.position.y = 0.05 + 1.1 * Math.sin(t * Math.PI);
        if (t >= 1) { AudioEngine.move(); mesh.position.y = 0.05; done(); return; }
        requestAnimationFrame(tick);
      };
      tick();
    }

    // ── Battle animation ─────────────────────────────────────────
    function battleAnim(attMesh, defMesh, targetPos, capColor, onDone) {
      const startPos = attMesh.position.clone();
      const defPos = defMesh.position.clone();
      const clashPos = startPos.clone().lerp(defPos, 0.74); clashPos.y = 0.52;
      const flash = new THREE.PointLight(capColor, 0, 10);
      flash.position.copy(defPos).setY(0.7); scene.add(flash);
      const flash2 = new THREE.PointLight(0xffffff, 0, 6);
      flash2.position.copy(defPos).setY(0.4); scene.add(flash2);
      let phase = 0, t = 0;
      const D = { CHARGE: 0.34, CLASH: 0.40, FALL: 0.50 };
      const tick = () => {
        if (destroyed) { scene.remove(flash); scene.remove(flash2); return; }
        t += 1 / 60;
        if (phase === 0) {
          const prog = Math.min(t / D.CHARGE, 1);
          const e = prog < 0.5 ? 4 * prog * prog * prog : 1 - Math.pow(-2 * prog + 2, 3) / 2;
          attMesh.position.lerpVectors(startPos, clashPos, e);
          attMesh.position.y = 0.05 + Math.sin(prog * Math.PI) * 1.0;
          const dir = new THREE.Vector3().subVectors(clashPos, startPos).normalize();
          attMesh.rotation.z = -dir.x * 0.3 * Math.sin(prog * Math.PI);
          if (prog >= 1) { attMesh.rotation.z = 0; phase = 1; t = 0; }
        } else if (phase === 1) {
          const prog = t / D.CLASH;
          const decay = 1 - prog * 0.6;
          const shk = Math.sin(t * 88) * 0.09 * decay;
          const shk2 = Math.cos(t * 72) * 0.065 * decay;
          attMesh.position.x = clashPos.x + shk;
          attMesh.position.z = clashPos.z + shk2;
          attMesh.position.y = clashPos.y * (1 - prog * 0.5);
          attMesh.rotation.z = Math.sin(t * 62) * 0.12 * decay;
          defMesh.position.x = defPos.x - shk * 0.55;
          defMesh.position.z = defPos.z - shk2 * 0.5;
          defMesh.rotation.z = Math.sin(t * 58) * 0.08 * decay;
          const fp = Math.sin(prog * Math.PI);
          flash.intensity = fp * 13; flash2.intensity = fp * 7;
          if (t >= D.CLASH) {
            AudioEngine.clash();
            particles.push(mkBurst({ x: defPos.x, y: 0.5, z: defPos.z }, capColor, 0.09, 110));
            particles.push(mkBurst({ x: defPos.x, y: 0.3, z: defPos.z }, 0xffffff, 0.05, 60));
            for (let i = 0; i < 8; i++) {
              const a = i * Math.PI / 4;
              particles.push(mkBurst({ x: defPos.x + Math.cos(a) * 0.32, y: 0.22, z: defPos.z + Math.sin(a) * 0.32 }, capColor, 0.05, 18));
            }
            flash.intensity = 0; flash2.intensity = 0;
            scene.remove(flash); scene.remove(flash2);
            defMesh.rotation.z = 0; attMesh.rotation.z = 0;
            phase = 2; t = 0;
          }
        } else if (phase === 2) {
          const fallP = Math.min(t / D.FALL, 1);
          const fe = fallP < 0.5 ? 2 * fallP * fallP : -1 + (4 - 2 * fallP) * fallP;
          defMesh.position.y = defPos.y - fe * 2.8;
          defMesh.rotation.x = fe * 2.4;
          defMesh.rotation.z = fe * 1.6 * (defPos.x >= 0 ? 1 : -1);
          defMesh.scale.setScalar(Math.max(0.001, 1 - fe * 0.94));
          const sp = Math.min(t / (D.FALL * 0.80), 1);
          const se = sp < 0.5 ? 2 * sp * sp : -1 + (4 - 2 * sp) * sp;
          attMesh.position.lerpVectors(clashPos, targetPos, se);
          attMesh.position.y = 0.05 + Math.sin(sp * Math.PI) * 0.4;
          if (fallP >= 1) {
            scene.remove(defMesh);
            attMesh.position.copy(targetPos); attMesh.position.y = 0.05;
            attMesh.rotation.set(0, attMesh.userData.color === W ? Math.PI : 0, 0);
            onDone(); return;
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // ── Game state ───────────────────────────────────────────────
    const gsRef = { current: initGame() };
    spawnAll(gsRef.current.board);

    // ── History ──────────────────────────────────────────────────
    function snapPM() {
      const s = {};
      for (const [k, g] of Object.entries(PM))
        s[k] = { type: g.userData.type, color: g.userData.color };
      return s;
    }
    function pushHistory(gs) {
      historyRef.current.push({ gs: JSON.parse(JSON.stringify(gs)), pmSnap: snapPM() });
    }
    function restoreSnap(snap) {
      Object.values(PM).forEach(m => scene.remove(m));
      for (const k in PM) delete PM[k];
      for (const [k, { type, color }] of Object.entries(snap.pmSnap)) {
        const [r, f] = k.split(",").map(Number);
        const m = makePiece(type, color);
        const pos = toWorld(r, f);
        m.position.set(pos.x, 0.05, pos.z);
        m.userData = { ...m.userData, r, f };
        scene.add(m); PM[k] = m;
      }
    }

    function statusMsg(ngs, moverC) {
      if (ngs.status === "checkmate") return `☠  CHECKMATE — ${moverC === W ? "WHITE" : "BLACK"} WINS!`;
      if (ngs.status === "stalemate") return "⚖  STALEMATE — DRAW";
      if (ngs.status === "check") return `⚡  ${ngs.turn === W ? "WHITE" : "BLACK"} IS IN CHECK!`;
      return `${ngs.turn === W ? "⚔  WHITE" : "⚔  BLACK"}'S TURN`;
    }

    // ── AI turn ──────────────────────────────────────────────────
    function doAITurn() {
      animatingRef.current = true;
      aiPendingRef.current = true;
      setThinking(true);
      setTimeout(() => {
        if (destroyed || !aiPendingRef.current) return;
        aiPendingRef.current = false;
        const best = getBestMove(gsRef.current, DIFF_MAP[diffRef.current]);
        setThinking(false);
        if (best) {
          animatingRef.current = false;
          executeMove(...best);
        } else {
          animatingRef.current = false;
        }
      }, 80);
    }

    // ── Execute a move ───────────────────────────────────────────
    function executeMove(fr, ff, tr, tf, promoTo = null) {
      if (animatingRef.current) return;
      const g = gsRef.current;
      const piece = g.board[fr][ff];
      const isPawnPromo = piece?.t === "P" && (tr === 0 || tr === 7);
      const isHuman = modeRef.current === "pvp" || (modeRef.current === "ai" && g.turn === W);

      if (isPawnPromo && isHuman && promoTo === null) {
        setPromoModal({
          color: piece.c, resolve: (choice) => {
            setPromoModal(null);
            executeMove(fr, ff, tr, tf, choice);
          }
        });
        return;
      }

      animatingRef.current = true;
      const chosenPromo = promoTo ?? "Q";
      pushHistory(gsRef.current);

      const fk = `${fr},${ff}`, tk = `${tr},${tf}`;
      const movMesh = PM[fk], capMesh = PM[tk];
      const tPos = toWorld(tr, tf);
      const wasEP = piece?.t === "P" && g.ep && tr === g.ep[0] && tf === g.ep[1];
      const wasCastle = piece?.t === "K" && Math.abs(tf - ff) === 2;
      const ngs = doMove(g, fr, ff, tr, tf, isPawnPromo ? chosenPromo : "Q");

      const castleRookFromKey = wasCastle ? `${fr},${tf === 6 ? 7 : 0}` : null;
      const castleRookToPos = wasCastle ? toWorld(fr, tf === 6 ? 5 : 3) : null;
      const castleRookToKey = wasCastle ? `${fr},${tf === 6 ? 5 : 3}` : null;

      const afterAnim = () => {
        delete PM[fk];
        if (isPawnPromo) {
          scene.remove(movMesh);
          const newM = makePiece(chosenPromo, piece.c);
          newM.position.set(tPos.x, 0.05, tPos.z);
          newM.userData = { type: chosenPromo, color: piece.c, r: tr, f: tf };
          scene.add(newM); PM[tk] = newM;
          particles.push(mkBurst({ x: tPos.x, y: 0.3, z: tPos.z }, piece.c === W ? THEME.whiteAccent : THEME.blackAccent, 0.1, 120));
        } else {
          PM[tk] = movMesh;
          movMesh.userData = { ...movMesh.userData, r: tr, f: tf };
        }

        if (wasCastle) {
          const rkM = PM[castleRookFromKey];
          if (rkM) {
            delete PM[castleRookFromKey];
            animPiece(rkM, castleRookToPos, 0.32, () => {
              PM[castleRookToKey] = rkM;
              rkM.userData = { ...rkM.userData, r: fr, f: tf === 6 ? 5 : 3 };
              finish();
            });
          } else finish();
        } else {
          finish();
        }
      };

      const finish = () => {
        gsRef.current = { ...ngs, sel: null, lm: [] };
        animatingRef.current = false;
        const chkC = (ngs.status === "check" || ngs.status === "checkmate") ? ngs.turn : null;
        if (chkC) AudioEngine.check();
        showHL(null, [], ngs.last, chkC, ngs.board);
        setCaps({ w: ngs.capW, b: ngs.capB });
        setMoveCount(c => c + 1);
        setMsg(statusMsg(ngs, piece.c));

        const note = ngs.last?.note ?? "?";
        if (piece.c === W) {
          pendingLogRef.current = { w: note, b: null };
          setMoveLog(ml => [...ml, { w: note, b: null }]);
        } else {
          if (pendingLogRef.current?.b === null) {
            const upd = { ...pendingLogRef.current, b: note };
            pendingLogRef.current = upd;
            setMoveLog(ml => { const n = [...ml]; n[n.length - 1] = upd; return n; });
          } else {
            setMoveLog(ml => [...ml, { w: "—", b: note }]);
          }
        }

        if (modeRef.current === "ai") {
          localStorage.setItem("battleChessSave", JSON.stringify(ngs));
        }

        if (modeRef.current === "ai" && ngs.turn === B &&
          (ngs.status === "playing" || ngs.status === "check")) {
          doAITurn();
        }
      };

      if (wasEP) {
        const epK = `${fr},${tf}`;
        if (PM[epK]) {
          const ep = toWorld(fr, tf);
          particles.push(mkBurst({ x: ep.x, y: 0.3, z: ep.z }, THEME.whiteAccent));
          scene.remove(PM[epK]); delete PM[epK];
        }
      }
      if (capMesh && !wasEP) {
        battleAnim(movMesh, capMesh, tPos, capMesh.userData.color === W ? THEME.whiteAccent : THEME.blackAccent, afterAnim);
      } else {
        animPiece(movMesh, tPos, 0.42, afterAnim);
      }
    }

    // ── Click handler ────────────────────────────────────────────
    function handleClick(r, f) {
      if (animatingRef.current) return;
      const g = gsRef.current;
      if (g.status === "checkmate" || g.status === "stalemate") return;
      if (modeRef.current === "ai" && g.turn === B) return;
      if (g.sel) {
        const [sr, sf] = g.sel;
        if ((g.lm || []).some(([lr, lf]) => lr === r && lf === f)) {
          gsRef.current = { ...g, sel: null, lm: [] };
          executeMove(sr, sf, r, f);
        } else if (g.board[r][f]?.c === g.turn) {
          const moves = legalMoves(g, r, f);
          gsRef.current = { ...g, sel: [r, f], lm: moves };
          showHL([r, f], moves, g.last, g.status === "check" ? g.turn : null, g.board);
        } else {
          gsRef.current = { ...g, sel: null, lm: [] };
          showHL(null, [], g.last, g.status === "check" ? g.turn : null, g.board);
        }
      } else {
        if (g.board[r][f]?.c === g.turn) {
          const moves = legalMoves(g, r, f);
          gsRef.current = { ...g, sel: [r, f], lm: moves };
          showHL([r, f], moves, g.last, g.status === "check" ? g.turn : null, g.board);
        }
      }
    }

    // ── Camera orbit ─────────────────────────────────────────────
    let theta = 0.3, phi = 0.55, camDist = 11.5;
    function updateCam() {
      const dist = gameStartedRef.current ? camDist : camDist * 1.8;
      const pitchMod = gameStartedRef.current ? 0 : 0.2;
      camera.position.x = dist * Math.sin(theta) * Math.cos(phi + pitchMod);
      camera.position.y = dist * Math.sin(phi + pitchMod);
      camera.position.z = dist * Math.cos(theta) * Math.cos(phi + pitchMod);
      camera.lookAt(0, 0.5, 0);
    }
    updateCam();

    // ── Raycaster ────────────────────────────────────────────────
    const ray = new THREE.Raycaster();
    const mv2 = new THREE.Vector2();
    function getSquareFromHit(hits) {
      if (!hits.length) return null;
      let obj = hits[0].object;
      while (obj && obj.userData.r === undefined) {
        obj = obj.parent;
      }
      if (obj && obj.userData.r !== undefined) return [obj.userData.r, obj.userData.f];
      return null;
    }

    // ── Mouse events ─────────────────────────────────────────────
    let isDrag = false, dsx = 0, dsy = 0, didMove = false;
    const onMouseDown = (e) => {
      AudioEngine.init();
      if (e.button === 2) {
        isDrag = true; didMove = false; dsx = e.clientX; dsy = e.clientY;
      }
    };
    const onMouseMove = (e) => {
      if (!isDrag) return;
      const dx = e.clientX - dsx, dy = e.clientY - dsy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMove = true;
      theta -= dx * 0.0048;
      phi = Math.max(0.14, Math.min(Math.PI / 2.08, phi - dy * 0.0048));
      dsx = e.clientX; dsy = e.clientY; updateCam();
    };
    const onMouseUp = (e) => {
      isDrag = false;
      if (didMove) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mv2.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mv2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mv2, camera);
      const hits = ray.intersectObjects([...sqMeshes.flat(), ...Object.values(PM)], true);
      const sq = getSquareFromHit(hits);
      if (sq) handleClick(sq[0], sq[1]);
    };

    // ── Touch events ─────────────────────────────────────────────
    let touchStartX = 0, touchStartY = 0, touchMoved = false;
    const onTouchStart = (e) => {
      AudioEngine.init();
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
        isDrag = true; dsx = touchStartX; dsy = touchStartY; didMove = false;
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 1 && isDrag) {
        const dx = e.touches[0].clientX - dsx;
        const dy = e.touches[0].clientY - dsy;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { touchMoved = true; didMove = true; }
        theta -= dx * 0.0048;
        phi = Math.max(0.14, Math.min(Math.PI / 2.08, phi - dy * 0.0048));
        dsx = e.touches[0].clientX; dsy = e.touches[0].clientY; updateCam();
      }
    };
    const onTouchEnd = (e) => {
      isDrag = false;
      if (touchMoved) return;
      const touch = e.changedTouches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      mv2.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      mv2.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mv2, camera);
      const parts = Object.values(PM).flatMap(grp => grp.children);
      const hits = ray.intersectObjects([...sqMeshes.flat(), ...parts], false);
      const sq = getSquareFromHit(hits);
      if (sq) handleClick(sq[0], sq[1]);
    };

    const onMouseWheel = (e) => {
      e.preventDefault();
      const zoomAmount = e.deltaY > 0 ? 1.1 : 0.9;
      camDist = Math.max(6, Math.min(25, camDist * zoomAmount));
      updateCam();
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });
    renderer.domElement.addEventListener("touchend", onTouchEnd);
    renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // ── Reset ────────────────────────────────────────────────────
    window._battleChessReset = () => {
      aiPendingRef.current = false;
      animatingRef.current = false;
      gsRef.current = initGame();
      spawnAll(gsRef.current.board);
      clearHL();
      setMsg("⚔  WHITE'S TURN");
      setCaps({ w: [], b: [] });
      setMoveCount(0);
      setThinking(false);
      setMoveLog([]);
      setPromoModal(null);
      historyRef.current = [];
      pendingLogRef.current = { w: null, b: null };
    };

    window._battleChessMenuStart = (cfg) => {
      if (cfg) {
        if (cfg.mode) { modeRef.current = cfg.mode; setModeFixed(cfg.mode); }
        if (cfg.diff) { diffRef.current = cfg.diff; setDiffFixed(cfg.diff); }
        window._battleChessReset?.();
      } else {
        const saved = localStorage.getItem("battleChessSave");
        if (saved) {
          try {
            const sgs = JSON.parse(saved);
            gsRef.current = sgs;
            modeRef.current = "ai"; setModeFixed("ai");
            spawnAll(gsRef.current.board);
            clearHL();

            // Re-sync simple state params
            setMsg(statusMsg(sgs, sgs.turn === W ? B : W));
            setCaps({ w: sgs.capW, b: sgs.capB });
          } catch (e) {
            console.error("Save state corrupt:", e);
            window._battleChessReset?.();
          }
        } else {
          window._battleChessReset?.();
        }
      }
      gameStartedRef.current = true;
      setGameStarted(true);

      let t = 0;
      const startDist = camDist * 1.8;
      const endDist = camDist;

      const zoomIn = () => {
        if (destroyed) return;
        t += 0.016;
        const prog = Math.min(t / 1.0, 1);
        const ease = 1 - Math.pow(1 - prog, 3);

        // Calculate new targeted distance safely
        const targetedDist = endDist + (startDist - endDist) * (1 - ease);
        const pitchMod = 0.2 * (1 - ease);

        // Directly resolve orbit positions instead of scaling incrementally
        camera.position.x = targetedDist * Math.sin(theta) * Math.cos(phi + pitchMod);
        camera.position.y = targetedDist * Math.sin(phi + pitchMod);
        camera.position.z = targetedDist * Math.cos(theta) * Math.cos(phi + pitchMod);
        camera.lookAt(0, 0.5, 0);

        if (prog < 1) requestAnimationFrame(zoomIn);
      };

      requestAnimationFrame(zoomIn);
    };

    // ── Exit to Menu ─────────────────────────────────────────────
    window._battleChessExitToMenu = () => {
      gameStartedRef.current = false;
      setGameStarted(false);
      theta = 0.3; phi = 0.55;
      updateCam();
    };

    // ── Undo ─────────────────────────────────────────────────────
    window._battleChessUndo = () => {
      aiPendingRef.current = false;
      if (animatingRef.current) return;
      if (historyRef.current.length === 0) return;
      setThinking(false);
      const steps = modeRef.current === "ai"
        ? Math.min(2, historyRef.current.length)
        : 1;
      historyRef.current.splice(historyRef.current.length - steps, steps);

      if (historyRef.current.length === 0) {
        gsRef.current = initGame();
        spawnAll(gsRef.current.board);
        clearHL();
        setMsg("⚔  WHITE'S TURN");
        setCaps({ w: [], b: [] });
        setMoveCount(0);
        setMoveLog([]);
        pendingLogRef.current = { w: null, b: null };
      } else {
        const snap = historyRef.current[historyRef.current.length - 1];
        gsRef.current = { ...JSON.parse(JSON.stringify(snap.gs)), sel: null, lm: [] };
        restoreSnap(snap);
        const g = gsRef.current;
        const chkC = (g.status === "check" || g.status === "checkmate") ? g.turn : null;
        showHL(null, [], g.last, chkC, g.board);
        setCaps({ w: g.capW, b: g.capB });
        setMoveCount(historyRef.current.length);
        const turnMsg = g.status === "checkmate"
          ? `☠  CHECKMATE`
          : `${g.turn === W ? "⚔  WHITE" : "⚔  BLACK"}'S TURN`;
        setMsg(turnMsg);
        const totalPlies = historyRef.current.length;
        const logPairs = Math.ceil(totalPlies / 2);
        setMoveLog(ml => {
          const trimmed = ml.slice(0, logPairs);
          if (trimmed.length > 0 && totalPlies % 2 === 1) {
            const last = { ...trimmed[trimmed.length - 1], b: null };
            return [...trimmed.slice(0, -1), last];
          }
          return trimmed;
        });
        pendingLogRef.current = { w: null, b: null };
      }
      animatingRef.current = false;
    };

    // ── Render loop ──────────────────────────────────────────────
    let rafId;
    const clock = new THREE.Clock();
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      if (destroyed) return;
      const t = clock.getElapsedTime();
      for (let i = particles.length - 1; i >= 0; i--)
        if (!particles[i]()) particles.splice(i, 1);

      galaxy.tick(t);

      accentPt.position.x = -3 + Math.sin(t * 0.3) * 0.8;
      accentPt.position.z = -3 + Math.cos(t * 0.3) * 0.8;

      // Animate hellfire pillars
      pillars.forEach((p, i) => {
        const fl = p.userData.fireLight;
        const fg = p.userData.flameGem;
        if (fl) fl.intensity = 2.2 + Math.sin(t * 4.5 + i * 1.3) * 0.9 + Math.sin(t * 11 + i) * 0.3;
        if (fg) fg.position.y = 2.1 + Math.sin(t * 5.5 + i * 0.8) * 0.04;
      });

      // Pulse lava underglow
      glowLight.intensity = 3.5 + Math.sin(t * 0.8) * 0.8 + Math.sin(t * 2.3) * 0.4;
      glowLight2.intensity = 1.5 + Math.sin(t * 1.2 + 1) * 0.5;
      glowLight3.intensity = 1.2 + Math.sin(t * 0.9 + 2) * 0.4;

      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      EW = el.clientWidth; EH = el.clientHeight;
      camera.aspect = EW / EH;
      camera.updateProjectionMatrix();
      renderer.setSize(EW, EH);
    };
    window.addEventListener("resize", onResize);

    const onModeChanged = () => {
      const g = gsRef.current;
      if (modeRef.current === "ai" && g.turn === B && (g.status === "playing" || g.status === "check") && !animatingRef.current) {
        doAITurn();
      }
    };
    window.addEventListener('battle-mode-changed', onModeChanged);

    return () => {
      destroyed = true;
      window.removeEventListener('battle-mode-changed', onModeChanged);
      aiPendingRef.current = false;
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <ChessUI
      mountRef={mountRef}
      msg={msg}
      caps={caps}
      moveCount={moveCount}
      mode={mode}
      diff={diff}
      thinking={thinking}
      promoModal={promoModal}
      moveLog={moveLog}
      logOpen={logOpen}
      logRef={logRef}
      setModeFixed={setModeFixed}
      setDiffFixed={setDiffFixed}
      setLogOpen={setLogOpen}
      gameStarted={gameStarted}
      onMenuStart={handleMenuStart}
    />
  );
}