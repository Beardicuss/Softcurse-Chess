/**
 * GameRoom — Cloudflare Durable Object
 * Manages one chess game room: 2 WebSocket players, move relay, turn enforcement.
 * Includes rate limiting and idle timeout for Cloudflare free tier protection.
 */
export class GameRoom {
    constructor(state, env) {
        this.state = state;
        this.sessions = []; // { ws, side: "w"|"b", msgCount: 0, lastMsgTime: 0 }
        this.gameStarted = false;
        this.currentTurn = "w";
        this.moveHistory = [];
        this.createdAt = Date.now();

        // Limits
        this.MAX_MOVES = 300;          // max moves per game (150 per player)
        this.MAX_MSGS_PER_MIN = 30;    // max messages per player per minute
        this.IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 min idle → auto-close

        // Schedule idle check
        this.idleTimer = null;
        this.lastActivity = Date.now();
    }

    resetIdleTimer() {
        this.lastActivity = Date.now();
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => this.closeIdle(), this.IDLE_TIMEOUT_MS);
    }

    closeIdle() {
        this.broadcast({ type: "error", msg: "Room closed due to inactivity" });
        this.sessions.forEach((s) => {
            try { s.ws.close(1000, "Idle timeout"); } catch (e) { /* ok */ }
        });
        this.sessions = [];
        this.gameStarted = false;
    }

    async fetch(request) {
        const url = new URL(request.url);

        // Status endpoint
        if (url.pathname === "/status") {
            return Response.json({
                players: this.sessions.length,
                started: this.gameStarted,
                turn: this.currentTurn,
                moves: this.moveHistory.length,
                maxMoves: this.MAX_MOVES,
                idleMs: Date.now() - this.lastActivity,
            });
        }

        // WebSocket upgrade
        if (request.headers.get("Upgrade") !== "websocket") {
            return new Response("Expected WebSocket", { status: 426 });
        }

        if (this.sessions.length >= 2) {
            return new Response("Room full", { status: 409 });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        const side = this.sessions.length === 0 ? "w" : "b";
        const session = { ws: server, side, msgCount: 0, windowStart: Date.now() };
        this.sessions.push(session);

        server.accept();
        this.resetIdleTimer();

        // Tell this player their assigned side
        server.send(JSON.stringify({ type: "assigned", side }));

        // If both players are here, start the game
        if (this.sessions.length === 2) {
            this.gameStarted = true;
            this.broadcast({ type: "start", turn: "w" });
        }

        server.addEventListener("message", (event) => {
            // Rate limit check
            const now = Date.now();
            if (now - session.windowStart > 60000) {
                session.msgCount = 0;
                session.windowStart = now;
            }
            session.msgCount++;
            if (session.msgCount > this.MAX_MSGS_PER_MIN) {
                server.send(JSON.stringify({ type: "error", msg: "Rate limit exceeded. Slow down." }));
                return;
            }

            this.resetIdleTimer();

            try {
                const msg = JSON.parse(event.data);
                this.handleMessage(session, msg);
            } catch (e) {
                server.send(JSON.stringify({ type: "error", msg: "Invalid message" }));
            }
        });

        server.addEventListener("close", () => {
            this.sessions = this.sessions.filter((s) => s !== session);
            this.broadcast({ type: "opponent_left" });
            this.gameStarted = false;
        });

        server.addEventListener("error", () => {
            this.sessions = this.sessions.filter((s) => s !== session);
            this.broadcast({ type: "opponent_left" });
        });

        return new Response(null, { status: 101, webSocket: client });
    }

    handleMessage(session, msg) {
        switch (msg.type) {
            case "move": {
                if (!this.gameStarted) {
                    session.ws.send(JSON.stringify({ type: "error", msg: "Game not started" }));
                    return;
                }
                if (session.side !== this.currentTurn) {
                    session.ws.send(JSON.stringify({ type: "error", msg: "Not your turn" }));
                    return;
                }
                if (this.moveHistory.length >= this.MAX_MOVES) {
                    this.broadcast({ type: "error", msg: "Move limit reached. Game is a draw." });
                    this.broadcast({ type: "game_over", reason: "move_limit" });
                    this.gameStarted = false;
                    return;
                }

                const { fr, ff, tr, tf, promo } = msg;
                this.moveHistory.push({ side: session.side, fr, ff, tr, tf, promo });
                this.currentTurn = this.currentTurn === "w" ? "b" : "w";

                // Relay move to opponent
                this.sessions.forEach((s) => {
                    if (s !== session) {
                        s.ws.send(JSON.stringify({
                            type: "opponent_move",
                            fr, ff, tr, tf, promo,
                        }));
                    }
                });

                // Confirm move to sender
                session.ws.send(JSON.stringify({ type: "move_ok" }));
                break;
            }

            case "resign": {
                this.broadcast({ type: "resign", side: session.side });
                this.gameStarted = false;
                break;
            }

            default:
                session.ws.send(JSON.stringify({ type: "error", msg: "Unknown message type" }));
        }
    }

    broadcast(msg) {
        const data = JSON.stringify(msg);
        this.sessions.forEach((s) => {
            try { s.ws.send(data); } catch (e) { /* disconnected */ }
        });
    }
}
