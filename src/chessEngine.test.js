import { expect, test, describe } from 'vitest';
import { W, B, initGame, legalMoves, doMove, hasAnyLegal } from './chessEngine.js';

describe('Chess Engine', () => {

    test('Initial board setup is correct', () => {
        const gs = initGame();
        expect(gs.turn).toBe(W);
        expect(gs.status).toBe('playing');

        // Check white pawns
        for (let i = 0; i < 8; i++) {
            expect(gs.board[6][i].t).toBe('P');
            expect(gs.board[6][i].c).toBe(W);
        }
        // Check black pawns
        for (let i = 0; i < 8; i++) {
            expect(gs.board[1][i].t).toBe('P');
            expect(gs.board[1][i].c).toBe(B);
        }
    });

    test('White pawn moves on first turn', () => {
        const gs = initGame();
        // Pawn at e2 (row 6, col 4)
        const moves = legalMoves(gs, 6, 4);

        // Can move 1 or 2 squares forward
        expect(moves.length).toBe(2);
        expect(moves).toContainEqual([5, 4]); // e3
        expect(moves).toContainEqual([4, 4]); // e4
    });

    test('Scholar\'s Mate detection', () => {
        let gs = initGame();

        // 1. e4
        gs = doMove(gs, 6, 4, 4, 4);
        expect(gs.turn).toBe(B);

        // 1... e5
        gs = doMove(gs, 1, 4, 3, 4);
        expect(gs.turn).toBe(W);

        // 2. Qh5
        gs = doMove(gs, 7, 3, 3, 7);
        // 2... Nc6
        gs = doMove(gs, 0, 1, 2, 2);

        // 3. Bc4
        gs = doMove(gs, 7, 5, 4, 2);
        // 3... Nf6??
        gs = doMove(gs, 0, 6, 2, 5);

        // 4. Qxf7#
        gs = doMove(gs, 3, 7, 1, 5);

        expect(gs.status).toBe('checkmate');
        expect(hasAnyLegal(gs, B)).toBe(false);
    });

    test('En Passant legality', () => {
        let gs = initGame();

        // Setup en passant scenario
        gs = doMove(gs, 6, 4, 4, 4); // e4
        gs = doMove(gs, 1, 0, 2, 0); // a6
        gs = doMove(gs, 4, 4, 3, 4); // e5
        gs = doMove(gs, 1, 3, 3, 3); // d5 (allows en passant)

        expect(gs.ep).toEqual([2, 3]); // En passant target square is d6

        // Pawn at e5 (3,4) should be able to capture d6 (2,3)
        const pawnMoves = legalMoves(gs, 3, 4);
        expect(pawnMoves).toContainEqual([2, 3]);

        // Execute EP capture
        gs = doMove(gs, 3, 4, 2, 3);

        // The captured pawn at d5 (3,3) should be gone
        expect(gs.board[3][3]).toBeNull();
    });

    test('Castling legality', () => {
        let gs = initGame();

        // Clear out path for white kingside castling
        gs = doMove(gs, 6, 4, 4, 4); // e4
        gs = doMove(gs, 1, 0, 2, 0); // a6
        gs = doMove(gs, 7, 5, 4, 2); // Bc4
        gs = doMove(gs, 2, 0, 3, 0); // a5
        gs = doMove(gs, 7, 6, 5, 5); // Nf3
        gs = doMove(gs, 3, 0, 4, 0); // a4

        // King at e1 (7,4) should now be able to castle kingside to g1 (7,6)
        const kingMoves = legalMoves(gs, 7, 4);
        expect(kingMoves).toContainEqual([7, 6]);

        // Kingside castle
        gs = doMove(gs, 7, 4, 7, 6);

        // King is at g1 (7,6)
        expect(gs.board[7][6].t).toBe('K');
        // Rook jumped to f1 (7,5)
        expect(gs.board[7][5].t).toBe('R');
        // Original rook square h1 (7,7) is empty
        expect(gs.board[7][7]).toBeNull();
    });
});
