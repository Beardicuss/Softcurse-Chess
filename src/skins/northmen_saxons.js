// Northmen vs Anglo-Saxons — Viking raiders storm the Saxon kingdom
export default {
    id: "northmen_saxons",
    name: "Northmen vs Anglo-Saxons",
    description: "Viking raiders storm the Saxon kingdom",
    icon: "🪓",
    white: { P: "br_pawn", R: "br_rook", N: "br_knight", B: "br_bishop", Q: "br_queen", K: "br_king" },
    black: { P: "no_pawn", R: "no_rook", N: "no_knight", B: "no_bishop", Q: "no_queen", K: "no_king" },
    scale: { P: 0.40, R: 0.50, N: 0.65, B: 0.55, Q: 0.60, K: 0.65 },
    materialStyle: { white: "angel", black: "northmen" },
    yOffset: { P: 0.08, R: 0.08, N: 0.08, B: 0.08, Q: 0.08, K: 0.08 },
    // Whites: no extra rotation needed (BattleChess3D applies Math.PI)
    // Blacks: face right by default → rotate -90° to face forward
    rotationYWhite: {},
    rotationYBlack: { P: -Math.PI / 2, R: -Math.PI / 2, N: -Math.PI, B: -Math.PI / 2, Q: -Math.PI / 2, K: -Math.PI / 2 },
};
