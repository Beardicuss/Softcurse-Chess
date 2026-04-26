import * as THREE from "three";
// ═══════════════════════════════════════════════════════════════
//  SHARED CONSTANTS
// ═══════════════════════════════════════════════════════════════
export const SZ = 1.12;
export const OFF = -3.92;
export const toWorld = (r, f) => new THREE.Vector3(f * SZ + OFF, 0.05, r * SZ + OFF);
export const SYM_W = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" };
export const SYM_B = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
export const DARK_SQ = 0x1a1a1a;
export const LIGHT_SQ = 0xd2c1a5;
export const DIFF_MAP = { RECRUIT: 2, SOLDIER: 3, COMMANDER: 4 };
// ── Theme colors ──────────────────────────────────────────────
export const THEME = {
    bg: 0x0a0a0c,
    fogDensity: 0.018,
    boardBase: 0x111111,
    boardBorder: 0xcca35e,
    gridLine: 0xff00aa,
    whiteAccent: 0x00ffff,
    blackAccent: 0xff00aa,
    brass: "#c5a059",
};
