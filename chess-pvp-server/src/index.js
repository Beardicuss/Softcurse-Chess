/**
 * Chess PvP Server — Cloudflare Worker Entry Point
 * Routes: POST /room/create, GET /room/:id/ws, GET /room/:id/status
 * Includes rate limiting on room creation.
 */
import { GameRoom } from "./GameRoom.js";
export { GameRoom };

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// Simple in-memory rate limiter for room creation (per IP)
const createLimiter = new Map(); // ip -> { count, windowStart }
const MAX_ROOMS_PER_IP = 5;      // max 5 rooms per IP per hour
const LIMITER_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkCreateLimit(ip) {
    const now = Date.now();
    const entry = createLimiter.get(ip);
    if (!entry || now - entry.windowStart > LIMITER_WINDOW_MS) {
        createLimiter.set(ip, { count: 1, windowStart: now });
        return true;
    }
    if (entry.count >= MAX_ROOMS_PER_IP) return false;
    entry.count++;
    return true;
}

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // POST /room/create — generate a new room
        if (path === "/room/create" && request.method === "POST") {
            const ip = request.headers.get("CF-Connecting-IP") || "unknown";
            if (!checkCreateLimit(ip)) {
                return new Response(JSON.stringify({ error: "Rate limit: max 5 rooms per hour" }), {
                    status: 429,
                    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
                });
            }
            const roomId = generateRoomCode();
            return new Response(JSON.stringify({ roomId }), {
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            });
        }

        // GET /room/:id/ws — WebSocket connection to a room
        const wsMatch = path.match(/^\/room\/([A-Z0-9]+)\/ws$/);
        if (wsMatch) {
            const roomId = wsMatch[1];
            const id = env.GAME_ROOM.idFromName(roomId);
            const stub = env.GAME_ROOM.get(id);
            return stub.fetch(request);
        }

        // GET /room/:id/status — room status
        const statusMatch = path.match(/^\/room\/([A-Z0-9]+)\/status$/);
        if (statusMatch) {
            const roomId = statusMatch[1];
            const id = env.GAME_ROOM.idFromName(roomId);
            const stub = env.GAME_ROOM.get(id);
            const res = await stub.fetch(new Request("https://internal/status"));
            const data = await res.json();
            return new Response(JSON.stringify(data), {
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            });
        }

        // Health check
        if (path === "/" || path === "/health") {
            return new Response(JSON.stringify({ status: "ok", service: "chess-pvp-server" }), {
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            });
        }

        return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
    },
};

function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
