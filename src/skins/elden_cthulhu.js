// Elden Ring vs Cthulhu — Tarnished warriors face the cosmic horror of the deep
export default {
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
};
