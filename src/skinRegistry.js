import { ASSET_CDN } from "./constants.js";

// ═══════════════════════════════════════════════════════════════
//  SKIN REGISTRY — Central registry for all cosmetic sets
// ═══════════════════════════════════════════════════════════════

export const PIECE_SKINS = [
    {
        id: "angels_demons",
        name: "Angels vs Demons",
        description: "The original stone-carved celestial warriors",
        icon: "🏛",
        white: { P: "obj_003", R: "obj_005", N: "obj_002", B: "obj_000", Q: "obj_004", K: "obj_001" },
        black: { P: "obj_009", R: "obj_011", N: "obj_008", B: "obj_006", Q: "obj_010", K: "obj_007" },
        scale: { P: 0.55, R: 0.65, N: 0.7, B: 0.75, Q: 0.85, K: 0.9 },
        materialStyle: { white: "angel", black: "demon" },
        yOffset: {},
        rotationY: { N: -Math.PI / 0.5 },
    },
    {
        id: "necro_templar",
        name: "Necromancers vs Templars",
        description: "Dark sorcerers clash with holy knights",
        icon: "⚔",
        white: { P: "tp_pawn", R: "tp_rook", N: "tp_knight", B: "tp_bishop", Q: "tp_queen", K: "tp_king" },
        black: { P: "nc_pawn", R: "nc_rook", N: "nc_knight", B: "nc_bishop", Q: "nc_queen", K: "nc_king" },
        scale: { P: 0.55, R: 0.65, N: 0.7, B: 0.75, Q: 0.85, K: 0.9 },
        materialStyle: { white: "angel", black: "demon" },
        // Per-piece Y offset to raise pieces above the board surface
        yOffset: { P: 0.08, R: 0.08, N: 0.08, B: 0.08, Q: 0.08, K: 0.08 },
        // Per-piece Y rotation (radians) — knights face sideways by default
        rotationY: { N: -Math.PI / 2 },
    },
    {
        id: "northmen_saxons",
        name: "Northmen vs Anglo-Saxons",
        description: "Viking raiders storm the Saxon kingdom",
        icon: "🪓",
        white: { P: "br_pawn", R: "br_rook", N: "br_knight", B: "br_bishop", Q: "br_queen", K: "br_king" },
        black: { P: "no_pawn", R: "no_rook", N: "no_knight", B: "no_bishop", Q: "no_queen", K: "no_king" },
        scale: { P: 0.40, R: 0.50, N: 0.65, B: 0.55, Q: 0.60, K: 0.65 },
        materialStyle: { white: "angel", black: "northmen" },
        yOffset: { P: 0.08, R: 0.08, N: 0.08, B: 0.08, Q: 0.08, K: 0.08 },
        // Rotation per side (radians). degrees × Math.PI / 180
        // Whites: no extra rotation needed (BattleChess3D applies Math.PI)
        // Blacks: face right by default → rotate -90° to face forward
        rotationYWhite: {},
        rotationYBlack: { P: -Math.PI / 2, R: -Math.PI / 2, N: -Math.PI, B: -Math.PI / 2, Q: -Math.PI / 2, K: -Math.PI / 2 },
    },
    {
        id: "elden_cthulhu",
        name: "Elden Ring vs Cthulhu",
        description: "Tarnished warriors face the cosmic horror of the deep",
        icon: "🔥",
        white: { P: "el_pawn", R: "el_rook", N: "el_knight", B: "el_bishop", Q: "el_queen", K: "el_king" },
        black: { P: "ch_pawn", R: "ch_rook", N: "ch_knight", B: "ch_bishop", Q: "ch_queen", K: "ch_king" },
        scale: { P: 0.55, R: 0.65, N: 0.7, B: 0.75, Q: 0.85, K: 0.9 },
        materialStyle: { white: "erdtree", black: "cthulhu" },
        yOffset: { P: 0.08, R: 0.08, N: 0.08, B: 0.08, Q: 0.08, K: 0.08 },
        rotationYWhite: { P: Math.PI, R: Math.PI, N: Math.PI, B: Math.PI, Q: Math.PI, K: -Math.PI / 2 },
        rotationY: {},
    },
];

export const BOARD_SKINS = [
    { id: "classic", name: "Classic Stone", description: "Ancient marble battlefield", icon: "🏛", locked: false },
];

export const SCENE_SKINS = [
    { id: "void", name: "The Void", description: "Infinite cosmic darkness", icon: "🌌", locked: false },
];

// ── Persistence ──────────────────────────────────────────────
const STORAGE_KEY = "battleChessPieceSkin";

export function getActiveSkinId() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && PIECE_SKINS.some(s => s.id === saved)) return saved;
    } catch (e) { /* storage blocked */ }
    return "angels_demons";
}

export function setActiveSkinId(id) {
    try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
}

export function getActiveSkin() {
    const id = getActiveSkinId();
    return PIECE_SKINS.find(s => s.id === id) || PIECE_SKINS[0];
}
