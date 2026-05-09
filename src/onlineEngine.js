/**
 * Online Engine — WebSocket client for PvP multiplayer
 * Connects to the chess-pvp-server PartyKit room via standard WebSocket.
 */

// PartyKit host — deployed via `npx partykit deploy`
const PARTY_HOST = "chess-pvp-server.beardicuss.partykit.dev";

let ws = null;
let callbacks = {
    onAssigned: null,     // (side, moveHistory, gameStarted) => {}
    onStart: null,        // () => {}
    onOpponentMove: null, // ({ fr, ff, tr, tf, promo }) => {}
    onOpponentLeft: null, // () => {}
    onError: null,        // (msg) => {}
    onMoveOk: null,       // () => {}
    onResign: null,       // (side) => {}
    onRematch: null,      // () => {}
};

function connectToRoom(roomId) {
    return new Promise((resolve, reject) => {
        // PartyKit WebSocket URL format: wss://<host>/party/<room-id>
        const url = `wss://${PARTY_HOST}/party/${roomId}`;
        ws = new WebSocket(url);

        ws.onopen = () => resolve();
        ws.onerror = (e) => reject(e);

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                switch (msg.type) {
                    case "assigned":
                        callbacks.onAssigned?.(msg.side, msg.moveHistory, msg.gameStarted);
                        break;
                    case "start":
                        callbacks.onStart?.();
                        break;
                    case "opponent_move":
                        callbacks.onOpponentMove?.(msg);
                        break;
                    case "opponent_left":
                        callbacks.onOpponentLeft?.();
                        break;
                    case "move_ok":
                        callbacks.onMoveOk?.();
                        break;
                    case "resign":
                        callbacks.onResign?.(msg.side);
                        break;
                    case "rematch":
                        callbacks.onRematch?.();
                        break;
                    case "error":
                        callbacks.onError?.(msg.msg);
                        break;
                }
            } catch (e) {
                console.error("[OnlineEngine] Bad message:", e);
            }
        };

        ws.onclose = () => {
            callbacks.onOpponentLeft?.();
            ws = null;
        };
    });
}

// Room code generator (no I/O/0/1 to avoid confusion)
function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

/**
 * Create a new game room and connect to it.
 * Room is auto-created on PartyKit when the first WebSocket connects.
 * Returns the room code.
 */
export async function createRoom() {
    const roomId = generateRoomCode();
    await connectToRoom(roomId);
    return roomId;
}

/**
 * Join an existing game room by code.
 */
export async function joinRoom(code) {
    const roomId = code.toUpperCase().trim();
    await connectToRoom(roomId);
    return roomId;
}

/**
 * Send a move to the server.
 */
export function sendMove(fr, ff, tr, tf, promo = "Q") {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "move", fr, ff, tr, tf, promo }));
}

/**
 * Send rematch message.
 */
export function sendRematch() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "rematch" }));
}

/**
 * Disconnect from the room.
 */
export function disconnect() {
    if (ws) {
        ws.close();
        ws = null;
    }
}

/**
 * Register event callbacks.
 */
export function on(event, cb) {
    const key = "on" + event.charAt(0).toUpperCase() + event.slice(1);
    if (key in callbacks) callbacks[key] = cb;
}

/**
 * Check if currently connected.
 */
export function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
}
