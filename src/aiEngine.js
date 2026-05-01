import { W, legalMoves, doMove, toFEN, fromAlg } from "./chessEngine.js";

// ═══════════════════════════════════════════════════════════════
//  NEURAL AI — Cloud provider proxy
// ═══════════════════════════════════════════════════════════════
const PROXY = "https://chess-admin.pages.dev/api/chess-ai";

export async function getNeuralMove(gs, difficulty = "GRANDMASTER", moveNotes = []) {
    const fen = toFEN(gs);
    try {
        const res = await fetch(PROXY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fen, moveHistory: moveNotes, difficulty }),
        });
        if (!res.ok) throw new Error(`Proxy ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const coords = fromAlg(data.move);
        if (coords) return { move: coords, provider: data.provider };
    } catch (e) {
        console.error("[Neural AI]", e.message);
    }
    return null;
}

