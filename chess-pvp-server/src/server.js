/**
 * Chess PvP Server — PartyKit
 * Manages one chess game room: 2 WebSocket players, move relay, turn enforcement.
 * Includes rate limiting and idle timeout.
 */

// Room code generator (no I/O/0/1 to avoid confusion)
function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

export default class ChessRoom {
    constructor(room) {
        /** @type {import("partykit/server").Room} */
        this.room = room;

        this.sides = {};        // connectionId → "w" | "b" | "s"
        this.gameStarted = false;
        this.currentTurn = "w";
        this.moveHistory = [];
        this.createdAt = Date.now();

        // Limits
        this.MAX_MOVES = 300;
        this.MAX_MSGS_PER_MIN = 30;
        this.IDLE_TIMEOUT_MS = 15 * 60 * 1000;

        // Rate limit tracking: connectionId → { count, windowStart }
        this.rateLimits = {};

        // Idle timer
        this.lastActivity = Date.now();
        this.idleTimer = null;
    }

    // ── Lifecycle ──────────────────────────────────────────────

    onConnect(conn, ctx) {
        this.resetIdleTimer();

        // Assign side
        const taken = Object.values(this.sides);
        let side;
        if (!taken.includes("w")) side = "w";
        else if (!taken.includes("b")) side = "b";
        else side = "s"; // spectator

        this.sides[conn.id] = side;
        this.rateLimits[conn.id] = { count: 0, windowStart: Date.now() };

        // Tell this player their side + current state
        conn.send(JSON.stringify({
            type: "assigned",
            side,
            moveHistory: this.moveHistory,
            gameStarted: this.gameStarted,
            currentTurn: this.currentTurn,
        }));

        // If both players present, start
        const allSides = Object.values(this.sides);
        if (allSides.includes("w") && allSides.includes("b") && !this.gameStarted) {
            this.gameStarted = true;
            this.room.broadcast(JSON.stringify({ type: "start", turn: "w" }));
        }
    }

    onMessage(message, sender) {
        // Rate limit check
        const rl = this.rateLimits[sender.id];
        if (rl) {
            const now = Date.now();
            if (now - rl.windowStart > 60000) {
                rl.count = 0;
                rl.windowStart = now;
            }
            rl.count++;
            if (rl.count > this.MAX_MSGS_PER_MIN) {
                sender.send(JSON.stringify({ type: "error", msg: "Rate limit exceeded. Slow down." }));
                return;
            }
        }

        this.resetIdleTimer();

        let msg;
        try {
            msg = JSON.parse(message);
        } catch (e) {
            sender.send(JSON.stringify({ type: "error", msg: "Invalid message" }));
            return;
        }

        this.handleMessage(sender, msg);
    }

    onClose(conn) {
        const side = this.sides[conn.id];
        delete this.sides[conn.id];
        delete this.rateLimits[conn.id];

        if (side === "w" || side === "b") {
            this.room.broadcast(JSON.stringify({ type: "opponent_left" }));
            this.gameStarted = false;
        }
    }

    onError(conn, error) {
        this.onClose(conn);
    }

    // ── HTTP request handler (for /room/create and status) ────

    async onRequest(req) {
        const url = new URL(req.url);

        if (url.pathname === "/status") {
            return new Response(JSON.stringify({
                players: Object.keys(this.sides).length,
                started: this.gameStarted,
                turn: this.currentTurn,
                moves: this.moveHistory.length,
                maxMoves: this.MAX_MOVES,
                idleMs: Date.now() - this.lastActivity,
            }), { headers: { "Content-Type": "application/json" } });
        }

        return new Response("OK");
    }

    // ── Game logic ─────────────────────────────────────────────

    handleMessage(sender, msg) {
        const side = this.sides[sender.id];

        switch (msg.type) {
            case "move": {
                if (!this.gameStarted) {
                    sender.send(JSON.stringify({ type: "error", msg: "Game not started" }));
                    return;
                }
                if (side !== this.currentTurn) {
                    sender.send(JSON.stringify({ type: "error", msg: "Not your turn" }));
                    return;
                }
                if (this.moveHistory.length >= this.MAX_MOVES) {
                    this.room.broadcast(JSON.stringify({ type: "error", msg: "Move limit reached. Game is a draw." }));
                    this.room.broadcast(JSON.stringify({ type: "game_over", reason: "move_limit" }));
                    this.gameStarted = false;
                    return;
                }

                const { fr, ff, tr, tf, promo } = msg;
                this.moveHistory.push({ side, fr, ff, tr, tf, promo });
                this.currentTurn = this.currentTurn === "w" ? "b" : "w";

                // Relay move to all EXCEPT sender
                this.room.broadcast(
                    JSON.stringify({ type: "opponent_move", fr, ff, tr, tf, promo }),
                    [sender.id]    // exclude sender
                );

                // Confirm to sender
                sender.send(JSON.stringify({ type: "move_ok" }));
                break;
            }

            case "resign": {
                this.room.broadcast(JSON.stringify({ type: "resign", side }));
                this.gameStarted = false;
                break;
            }

            case "rematch": {
                this.room.broadcast(JSON.stringify({ type: "rematch" }));
                break;
            }

            default:
                sender.send(JSON.stringify({ type: "error", msg: "Unknown message type" }));
        }
    }

    // ── Utilities ──────────────────────────────────────────────

    resetIdleTimer() {
        this.lastActivity = Date.now();
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => this.closeIdle(), this.IDLE_TIMEOUT_MS);
    }

    closeIdle() {
        this.room.broadcast(JSON.stringify({ type: "error", msg: "Room closed due to inactivity" }));
        for (const conn of this.room.getConnections()) {
            try { conn.close(1000, "Idle timeout"); } catch (e) { /* ok */ }
        }
        this.sides = {};
        this.gameStarted = false;
    }
}

// Export room code generator for client-side use
ChessRoom.generateRoomCode = generateRoomCode;
