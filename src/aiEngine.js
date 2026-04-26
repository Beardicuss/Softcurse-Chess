import { W, legalMoves, doMove } from "./chessEngine.js";

// ═══════════════════════════════════════════════════════════════
//  AI ENGINE — Minimax + Alpha-Beta + PST
// ═══════════════════════════════════════════════════════════════
const PV = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
const PST = {
    P: [[0, 0, 0, 0, 0, 0, 0, 0], [5, 10, 10, -20, -20, 10, 10, 5], [5, -5, -10, 0, 0, -10, -5, 5], [0, 0, 0, 20, 20, 0, 0, 0], [5, 5, 10, 25, 25, 10, 5, 5], [10, 10, 20, 30, 30, 20, 10, 10], [50, 50, 50, 50, 50, 50, 50, 50], [90, 90, 90, 90, 90, 90, 90, 90]],
    N: [[-50, -40, -30, -30, -30, -30, -40, -50], [-40, -20, 0, 5, 5, 0, -20, -40], [-30, 5, 10, 15, 15, 10, 5, -30], [-30, 0, 15, 20, 20, 15, 0, -30], [-30, 5, 15, 20, 20, 15, 5, -30], [-30, 0, 10, 15, 15, 10, 0, -30], [-40, -20, 0, 0, 0, 0, -20, -40], [-50, -40, -30, -30, -30, -30, -40, -50]],
    B: [[-20, -10, -10, -10, -10, -10, -10, -20], [-10, 0, 0, 0, 0, 0, 0, -10], [-10, 0, 5, 10, 10, 5, 0, -10], [-10, 5, 5, 10, 10, 5, 5, -10], [-10, 0, 10, 10, 10, 10, 0, -10], [-10, 10, 10, 10, 10, 10, 10, -10], [-10, 5, 0, 0, 0, 0, 5, -10], [-20, -10, -10, -10, -10, -10, -10, -20]],
    R: [[0, 0, 0, 5, 5, 0, 0, 0], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [5, 10, 10, 10, 10, 10, 10, 5], [0, 0, 0, 0, 0, 0, 0, 0]],
    Q: [[-20, -10, -10, -5, -5, -10, -10, -20], [-10, 0, 0, 0, 0, 0, 0, -10], [-10, 0, 5, 5, 5, 5, 0, -10], [-5, 0, 5, 5, 5, 5, 0, -5], [0, 0, 5, 5, 5, 5, 0, -5], [-10, 5, 5, 5, 5, 5, 0, -10], [-10, 0, 5, 0, 0, 0, 0, -10], [-20, -10, -10, -5, -5, -10, -10, -20]],
    K: [[20, 30, 10, 0, 0, 10, 30, 20], [20, 20, 0, 0, 0, 0, 20, 20], [-10, -20, -20, -20, -20, -20, -20, -10], [-20, -30, -30, -40, -40, -30, -30, -20], [-30, -40, -40, -50, -50, -40, -40, -30], [-30, -40, -40, -50, -50, -40, -40, -30], [-30, -40, -40, -50, -50, -40, -40, -30], [-30, -40, -40, -50, -50, -40, -40, -30]],
};

function evalBoard(board) {
    let s = 0;
    for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++) {
            const p = board[r][f]; if (!p) continue;
            const pi = p.c === W ? 7 - r : r;
            s += p.c === W
                ? (PV[p.t] + (PST[p.t]?.[pi]?.[f] ?? 0))
                : -(PV[p.t] + (PST[p.t]?.[pi]?.[f] ?? 0));
        }
    return s;
}

function getAllMoves(gs) {
    const mv = [];
    for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++)
            if (gs.board[r][f]?.c === gs.turn)
                for (const [tr, tf] of legalMoves(gs, r, f))
                    mv.push([r, f, tr, tf]);
    return mv;
}

function orderMoves(gs, moves) {
    return [...moves].sort((a, b) => {
        const cA = gs.board[a[2]][a[3]] ? PV[gs.board[a[2]][a[3]].t] : 0;
        const cB = gs.board[b[2]][b[3]] ? PV[gs.board[b[2]][b[3]].t] : 0;
        return cB - cA;
    });
}

function minimax(gs, depth, alpha, beta, max) {
    if (gs.status === "checkmate") return max ? -100000 : 100000;
    if (gs.status === "stalemate") return 0;
    if (depth === 0) return evalBoard(gs.board);
    const moves = orderMoves(gs, getAllMoves(gs));
    if (max) {
        let best = -Infinity;
        for (const [fr, ff, tr, tf] of moves) {
            const v = minimax(doMove(gs, fr, ff, tr, tf), depth - 1, alpha, beta, false);
            if (v > best) best = v;
            if (best > alpha) alpha = best;
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const [fr, ff, tr, tf] of moves) {
            const v = minimax(doMove(gs, fr, ff, tr, tf), depth - 1, alpha, beta, true);
            if (v < best) best = v;
            if (best < beta) beta = best;
            if (beta <= alpha) break;
        }
        return best;
    }
}

export function getBestMove(gs, depth) {
    let best = null, bv = Infinity;
    for (const mv of orderMoves(gs, getAllMoves(gs))) {
        const v = minimax(doMove(gs, ...mv), depth - 1, -Infinity, Infinity, true);
        if (v < bv) { bv = v; best = mv; }
    }
    return best;
}
