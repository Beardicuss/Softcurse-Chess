/**
 * Online Engine — WebSocket client for PvP multiplayer
 * Connects to the chess-pvp-server Durable Object via WebSocket.
 */

// TODO: Update this after deploying chess-pvp-server
const PVP_SERVER = "https://chess-pvp-server.softcursesys.workers.dev";

let ws = null;
let callbacks = {
    onAssigned: null,   // (side) => {}
    onStart: null,      // () => {}
    onOpponentMove: null, // ({ fr, ff, tr, tf, promo }) => {}
    onOpponentLeft: null, // () => {}
    onError: null,      // (msg) => {}
    onMoveOk: null,     // () => {}
    onResign: null,     // (side) => {}
    onRematch: null,    // () => {}
};

function connectWS(roomId) {
    return new Promise((resolve, reject) => {
        const protocol = PVP_SERVER.startsWith("https") ? "wss" : "ws";
        const host = PVP_SERVER.replace(/^https?:\/\//, "");
        const url = `${protocol}://${host}/room/${roomId}/ws`;

        ws = new WebSocket(url);

        ws.onopen = () => resolve();
        ws.onerror = (e) => reject(e);

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                switch (msg.type) {
                    case "assigned":
                        callbacks.onAssigned?.(msg.side);
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

/**
 * Create a new game room and connect to it.
 * Returns the room code.
 */
export async function createRoom() {
    const res = await fetch(`${PVP_SERVER}/room/create`, { method: "POST" });
    const { roomId } = await res.json();
    await connectWS(roomId);
    return roomId;
}

/**
 * Join an existing game room by code.
 */
export async function joinRoom(code) {
    const roomId = code.toUpperCase().trim();
    await connectWS(roomId);
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
 * Send resign message.
 */
export function resign() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "resign" }));
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
