// ═══════════════════════════════════════════════════════════════
//  CHESS ENGINE — Pure logic, zero dependencies
// ═══════════════════════════════════════════════════════════════
export const W = "w", B = "b";

export function initGame() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    ["R", "N", "B", "Q", "K", "B", "N", "R"].forEach((t, f) => {
        board[0][f] = { t, c: B, m: 0 };
        board[7][f] = { t, c: W, m: 0 };
    });
    for (let f = 0; f < 8; f++) {
        board[1][f] = { t: "P", c: B, m: 0 };
        board[6][f] = { t: "P", c: W, m: 0 };
    }
    return {
        board, turn: W, ep: null,
        cr: { w: { k: 1, q: 1 }, b: { k: 1, q: 1 } },
        status: "playing", capW: [], capB: [], last: null, sel: null, lm: []
    };
}

export const OB = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;

export function pseudoMoves(board, r, f, ep, cr) {
    const p = board[r][f]; if (!p) return [];
    const { t, c } = p; const opp = c === W ? B : W; const mv = [];
    if (t === "P") {
        const d = c === W ? -1 : 1, s = c === W ? 6 : 1;
        if (OB(r + d, f) && !board[r + d][f]) {
            mv.push([r + d, f]);
            if (r === s && !board[r + 2 * d][f]) mv.push([r + 2 * d, f]);
        }
        for (const df of [-1, 1]) {
            const nr = r + d, nf = f + df;
            if (OB(nr, nf) && (board[nr][nf]?.c === opp || (ep && ep[0] === nr && ep[1] === nf)))
                mv.push([nr, nf]);
        }
    } else if (t === "N") {
        for (const [dr, df] of [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]) {
            const nr = r + dr, nf = f + df;
            if (OB(nr, nf) && board[nr][nf]?.c !== c) mv.push([nr, nf]);
        }
    } else {
        const dirs = [];
        if (t === "R" || t === "Q") dirs.push([0, 1], [0, -1], [1, 0], [-1, 0]);
        if (t === "B" || t === "Q") dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
        for (const [dr, df] of dirs) {
            let nr = r + dr, nf = f + df;
            while (OB(nr, nf)) {
                if (board[nr][nf]) { if (board[nr][nf].c === opp) mv.push([nr, nf]); break; }
                mv.push([nr, nf]); nr += dr; nf += df;
            }
        }
    }
    if (t === "K") {
        for (const [dr, df] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const nr = r + dr, nf = f + df;
            if (OB(nr, nf) && board[nr][nf]?.c !== c) mv.push([nr, nf]);
        }
        const rk = c === W ? 7 : 0;
        if (r === rk && f === 4 && cr) {
            if (cr[c].k && !board[rk][5] && !board[rk][6]) mv.push([rk, 6]);
            if (cr[c].q && !board[rk][3] && !board[rk][2] && !board[rk][1]) mv.push([rk, 2]);
        }
    }
    return mv;
}

export function findKing(board, c) {
    for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++)
            if (board[r][f]?.t === "K" && board[r][f]?.c === c) return [r, f];
    return null;
}

export function attacked(board, r, f, byC) {
    const nc = { w: { k: 0, q: 0 }, b: { k: 0, q: 0 } };
    for (let sr = 0; sr < 8; sr++)
        for (let sf = 0; sf < 8; sf++)
            if (board[sr][sf]?.c === byC)
                if (pseudoMoves(board, sr, sf, null, nc).some(([mr, mf]) => mr === r && mf === f))
                    return true;
    return false;
}

export function inCheck(board, c) {
    const k = findKing(board, c);
    return k ? attacked(board, k[0], k[1], c === W ? B : W) : false;
}

export function applyMove(board, fr, ff, tr, tf, ep, promoTo = "Q") {
    const nb = board.map(row => row.map(p => p ? { ...p } : null));
    const p = { ...nb[fr][ff], m: 1 };
    let cap = nb[tr][tf], epCap = null;
    if (p.t === "P" && ep && tr === ep[0] && tf === ep[1]) {
        epCap = nb[fr][tf]; nb[fr][tf] = null;
    }
    nb[tr][tf] = p; nb[fr][ff] = null;
    if (p.t === "P" && (tr === 0 || tr === 7)) nb[tr][tf] = { ...p, t: promoTo };
    return { nb, cap: cap || epCap };
}

export function legalMoves(gs, r, f) {
    const { board, ep, cr, turn } = gs;
    const p = board[r][f]; if (!p || p.c !== turn) return [];
    const opp = turn === W ? B : W;
    return pseudoMoves(board, r, f, ep, cr).filter(([tr, tf]) => {
        if (p.t === "K" && Math.abs(tf - f) === 2) {
            if (inCheck(board, turn)) return false;
            const df = tf > f ? 1 : -1;
            if (attacked(board, r, f + df, opp) || attacked(board, r, tf, opp)) return false;
        }
        const { nb } = applyMove(board, r, f, tr, tf, ep);
        return !inCheck(nb, turn);
    });
}

export function hasAnyLegal(gs, c) {
    for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++)
            if (gs.board[r][f]?.c === c && legalMoves({ ...gs, turn: c }, r, f).length > 0)
                return true;
    return false;
}

function algNote(piece, fr, ff, tr, tf, isCap, promoTo) {
    const F = "abcdefgh", R = "87654321";
    if (piece.t === "K" && Math.abs(tf - ff) === 2) return tf === 6 ? "O-O" : "O-O-O";
    let s = piece.t === "P" ? "" : piece.t;
    if (piece.t === "P" && isCap) s += F[ff];
    if (isCap) s += "x";
    s += F[tf] + R[tr];
    if (promoTo) s += "=" + promoTo;
    return s;
}

export function doMove(gs, fr, ff, tr, tf, promoTo = "Q") {
    const { board, ep, cr, capW, capB } = gs;
    const p = board[fr][ff];
    const { nb, cap } = applyMove(board, fr, ff, tr, tf, ep, promoTo);
    if (p.t === "K" && Math.abs(tf - ff) === 2) {
        const rk = fr, ks = tf === 6, rF = ks ? 7 : 0, rT = ks ? 5 : 3;
        nb[rk][rT] = { ...nb[rk][rF], m: 1 }; nb[rk][rF] = null;
    }
    const ncr = { w: { ...cr.w }, b: { ...cr.b } };
    if (p.t === "K") ncr[p.c] = { k: 0, q: 0 };
    if (p.t === "R") {
        const br = p.c === W ? 7 : 0;
        if (fr === br) { if (ff === 7) ncr[p.c].k = 0; if (ff === 0) ncr[p.c].q = 0; }
    }
    const nep = (p.t === "P" && Math.abs(tr - fr) === 2) ? [(fr + tr) / 2, ff] : null;
    const next = p.c === W ? B : W;
    const nCW = [...capW], nCB = [...capB];
    if (cap) { if (cap.c === B) nCW.push(cap.t); else nCB.push(cap.t); }
    const isPawnPromoFinal = p.t === "P" && (tr === 0 || tr === 7);
    const note = algNote(p, fr, ff, tr, tf, !!cap, isPawnPromoFinal ? promoTo : null);
    const ngs = {
        board: nb, turn: next, ep: nep, cr: ncr,
        capW: nCW, capB: nCB,
        last: { fr, ff, tr, tf, piece: p, cap, note },
        status: "playing", sel: null, lm: []
    };
    if (inCheck(nb, next)) {
        ngs.status = hasAnyLegal(ngs, next) ? "check" : "checkmate";
    } else if (!hasAnyLegal(ngs, next)) {
        ngs.status = "stalemate";
    }
    if (ngs.status === "check") ngs.last.note += "+";
    if (ngs.status === "checkmate") ngs.last.note += "#";
    return ngs;
}
