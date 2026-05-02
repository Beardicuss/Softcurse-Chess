import { W, legalMoves, doMove, toFEN, fromAlg } from "./chessEngine.js";

// ═══════════════════════════════════════════════════════════════
//  NEURAL AI — Cloud provider proxy
// ═══════════════════════════════════════════════════════════════
const STOCKFISH_API = "https://stockfish.online/api/s/v2.php";

export async function getNeuralMove(gs, difficulty = "GRANDMASTER", moveNotes = []) {
    const fen = toFEN(gs);

    // Map string difficulty to Stockfish search depth
    let depth = 15;
    if (difficulty === "RECRUIT") depth = 1;
    else if (difficulty === "SOLDIER") depth = 5;
    else if (difficulty === "COMMANDER") depth = 10;

    try {
        const url = `${STOCKFISH_API}?fen=${encodeURIComponent(fen)}&depth=${depth}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Stockfish API ${res.status}`);
        const data = await res.json();

        if (data.success && data.bestmove) {
            // Parses "bestmove e2e4 ponder d7d5" -> "e2e4"
            const moveString = data.bestmove.split(" ")[1];
            const coords = fromAlg(moveString);
            if (coords) return { move: coords, provider: "Stockfish 16.1" };
        }
    } catch (e) {
        console.error("[Cloud Stockfish]", e.message);
    }
    return null;
}

