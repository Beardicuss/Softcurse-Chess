import * as THREE from "three";
// ═══════════════════════════════════════════════════════════════
//  SHARED CONSTANTS
// ═══════════════════════════════════════════════════════════════
export const SZ = 0.504;  // 1.12 × 0.45 (board scale)
export const OFF = -1.764; // -3.92 × 0.45 (board scale)
export const toWorld = (r, f) => new THREE.Vector3(f * SZ + OFF, 0.0, r * SZ + OFF);
export const SYM_W = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" };
export const SYM_B = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
export const DARK_SQ = 0x1a1a1a;
export const LIGHT_SQ = 0xd2c1a5;
export const DIFF_MAP = { RECRUIT: 2, SOLDIER: 3, COMMANDER: 4, GRANDMASTER: 0 };
// ── Theme colors ──────────────────────────────────────────────
export const THEME = {
    bg: 0x0a0a0c,
    fogDensity: 0.018,
    boardBase: 0x111111,
    boardBorder: 0xcca35e,
    gridLine: 0xff00aa,
    whiteAccent: 0xfff7ef,
    blackAccent: 0x7a3232,
    brass: "#c5a059",
};
