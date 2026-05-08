// Necromancers vs Templars — Dark sorcerers clash with holy knights
export default {
    id: "necro_templar",
    name: "Necromancers vs Templars",
    description: "Dark sorcerers clash with holy knights",
    icon: "⚔",
    white: { P: "tp_pawn", R: "tp_rook", N: "tp_knight", B: "tp_bishop", Q: "tp_queen", K: "tp_king" },
    black: { P: "nc_pawn", R: "nc_rook", N: "nc_knight", B: "nc_bishop", Q: "nc_queen", K: "nc_king" },
    scale: { P: 0.55, R: 0.65, N: 0.7, B: 0.75, Q: 0.85, K: 0.9 },
    materialStyle: { white: "angel", black: "demon" },
    yOffset: { P: 0.08, R: 0.08, N: 0.08, B: 0.08, Q: 0.08, K: 0.08 },
    rotationY: { N: -Math.PI / 2 },
};
