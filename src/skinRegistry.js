// ═══════════════════════════════════════════════════════════════
//  SKIN REGISTRY — Assembles skin configs from individual files
//  To add a new skin: create src/skins/your_skin.js + import here
// ═══════════════════════════════════════════════════════════════

import angels_demons from "./skins/angels_demons.js";
import necro_templar from "./skins/necro_templar.js";
import northmen_saxons from "./skins/northmen_saxons.js";
import elden_cthulhu from "./skins/elden_cthulhu.js";

// ── Piece skins — add new imports above + append to this array ──
export const PIECE_SKINS = [
    angels_demons,
    necro_templar,
    northmen_saxons,
    elden_cthulhu,
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
