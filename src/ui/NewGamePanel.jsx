import { useState, useRef } from "react";
import { useLang } from "../i18n.js";

// ── New Game sub-panel ───────────────────────────────────────
export default function NewGamePanel({ onStart, onBack, allPhasesReady }) {
    const { t } = useLang();
    const [step, setStep] = useState("mode"); // "mode" | "side" | "difficulty" | "join" | "waiting"
    const [mode, setMode] = useState(null);
    const [side, setSide] = useState("w"); // "w" (Angels) | "b" (Demons)
    const [diff, setDiff] = useState("SOLDIER");
    const [roomCode, setRoomCode] = useState("");
    const [joinInput, setJoinInput] = useState("");
    const [onlineStatus, setOnlineStatus] = useState("");
    const assignedSideRef = useRef(null); // ✅ FIX: Capture assigned side immediately

    const handleModeSelect = (m) => {
        setMode(m);
        if (m === "pvp") {
            onStart({ mode: "pvp", diff: null });
        } else if (m === "ai_vs_ai") {
            onStart({ mode: "ai_vs_ai", diff: "GRANDMASTER" });
        } else if (m === "online_lobby") {
            setStep("lobby");
        } else if (m === "online_create") {
            handleCreateRoom();
        } else if (m === "online_join") {
            setStep("join");
        } else {
            setStep("side");
        }
    };

    const handleCreateRoom = async () => {
        setOnlineStatus(t.CONNECTING);
        setStep("waiting");
        try {
            const { createRoom, on } = await import("../onlineEngine.js");
            const code = await createRoom();
            setRoomCode(code);
            setOnlineStatus(t.WAITING_OPP);
            on("assigned", (s, history, isStarted) => {
                assignedSideRef.current = s;
                setSide(s);
                if (isStarted) {
                    onStart({ mode: "online", diff: null, side: s, moveHistory: history });
                }
            });
            on("start", () => {
                onStart({ mode: "online", diff: null, side: assignedSideRef.current || side });
            });
        } catch (e) {
            setOnlineStatus(t.FAILED_CREATE);
            console.error(e);
        }
    };

    const handleJoinRoom = async () => {
        if (!joinInput.trim()) return;
        setOnlineStatus(t.JOINING);
        setStep("waiting");
        try {
            const { joinRoom, on } = await import("../onlineEngine.js");
            const code = await joinRoom(joinInput);
            setRoomCode(code);
            on("assigned", (s, history, isStarted) => {
                assignedSideRef.current = s;
                setSide(s);
                if (isStarted) {
                    onStart({ mode: "online", diff: null, side: s, moveHistory: history });
                }
            });
            on("start", () => {
                onStart({ mode: "online", diff: null, side: assignedSideRef.current || side });
            });
            setOnlineStatus(t.CONNECTED);
        } catch (e) {
            setOnlineStatus(t.FAILED_JOIN);
            setStep("join");
            console.error(e);
        }
    };

    const handleJoinNamedRoom = async (name) => {
        setOnlineStatus(`JOINING ${name}...`);
        setRoomCode(name);
        setStep("waiting");
        try {
            const { joinRoom, on } = await import("../onlineEngine.js");
            const code = await joinRoom(name);
            on("assigned", (s, history, isStarted) => {
                assignedSideRef.current = s;
                setSide(s);
                if (isStarted) {
                    onStart({ mode: "online", diff: null, side: s, moveHistory: history });
                }
            });
            on("start", () => {
                onStart({ mode: "online", diff: null, side: assignedSideRef.current || side });
            });
            setOnlineStatus(t.CONNECTED);
        } catch (e) {
            setOnlineStatus(t.FAILED_JOIN);
            setStep("lobby");
            console.error(e);
        }
    };

    const MYTH_ROOMS = [
        "TARTARUS", "VALHALLA", "OLYMPUS", "ELYSIUM", "ASGARD",
        "AALU", "NIFLHEIM", "AVALON", "HELIOPOLIS", "KUR"
    ];

    return (
        <div className="sub-panel" style={{ width: "100%" }}>
            {step === "mode" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.6)", fontSize: "16px", letterSpacing: "6px", marginBottom: "30px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                        {t.SELECT_MODE}
                    </div>
                    <button className="menu-item" onClick={() => handleModeSelect("ai")}>
                        <span className="menu-icon">🤖</span>
                        {t.PLAYER_VS_AI}
                    </button>
                    <button className="menu-item" onClick={() => handleModeSelect("pvp")}>
                        <span className="menu-icon">⚔</span>
                        {t.LOCAL_PVP}
                    </button>
                    <button className="menu-item" onClick={() => handleModeSelect("online_lobby")}>
                        <span className="menu-icon">🌐</span>
                        {t.ONLINE_PVP || "ONLINE LOBBY"}
                    </button>
                    <button className="menu-item" onClick={() => handleModeSelect("ai_vs_ai")}>
                        <span className="menu-icon">📽</span>
                        {t.AI_VS_AI}
                    </button>
                    <div style={{ height: "1px", background: "rgba(197,160,89,0.2)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={onBack} style={{ fontSize: "16px", opacity: 0.6, border: "none", background: "transparent" }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}

            {step === "lobby" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.6)", fontSize: "16px", letterSpacing: "6px", marginBottom: "20px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                        {t.ONLINE_PVP || "ONLINE LOBBY"}
                    </div>

                    {/* Private room section pinned to top */}
                    <div style={{ display: "flex", gap: "10px", marginBottom: "20px", width: "100%" }}>
                        <button
                            className="menu-item"
                            style={{ fontSize: "12px", flex: 1, padding: "12px", margin: 0, justifyContent: "center", letterSpacing: "1px" }}
                            onClick={() => handleModeSelect("online_create")}>
                            ➕ PRIVATE
                        </button>
                        <button
                            className="menu-item"
                            style={{ fontSize: "12px", flex: 1, padding: "12px", margin: 0, justifyContent: "center", letterSpacing: "1px" }}
                            onClick={() => handleModeSelect("online_join")}>
                            🔗 JOIN
                        </button>
                    </div>

                    <div style={{ height: "1px", background: "rgba(197,160,89,0.15)", margin: "0 0 16px 0", width: "100%" }} />

                    {/* Public Mythology Rooms Scrollable List */}
                    <div style={{ maxHeight: "35vh", overflowY: "auto", paddingRight: "4px", width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {MYTH_ROOMS.map(r => (
                            <button
                                key={r}
                                className="menu-item"
                                style={{ fontSize: "14px", padding: "12px 18px", margin: 0 }}
                                onClick={() => handleJoinNamedRoom(r)}>
                                <span className="menu-icon" style={{ opacity: 0.5 }}>🏛</span> {r} <span style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.4 }}>PUBLIC</span>
                            </button>
                        ))}
                    </div>

                    <div style={{ height: "1px", background: "rgba(197,160,89,0.2)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={() => setStep("mode")} style={{ fontSize: "16px", opacity: 0.6, border: "none", background: "transparent" }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}

            {step === "join" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.6)", fontSize: "16px", letterSpacing: "6px", marginBottom: "30px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                        {t.ENTER_ROOM_CODE}
                    </div>
                    <input
                        type="text"
                        value={joinInput}
                        onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                        placeholder="ABC123"
                        maxLength={6}
                        style={{
                            width: "100%", padding: "16px 20px", marginBottom: 16,
                            background: "rgba(5,1,10,0.6)", border: "1px solid rgba(197,160,89,0.3)",
                            color: "#c5a059", fontSize: "24px", letterSpacing: "12px",
                            fontFamily: "'Cinzel', serif", textAlign: "center",
                            outline: "none",
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                        autoFocus
                    />
                    <button className="menu-item" onClick={handleJoinRoom}>
                        <span className="menu-icon">▶</span>
                        {t.JOIN}
                    </button>
                    <div style={{ height: "1px", background: "rgba(197,160,89,0.2)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={() => setStep("mode")} style={{ fontSize: "16px", opacity: 0.6, border: "none", background: "transparent" }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}

            {step === "waiting" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.6)", fontSize: "16px", letterSpacing: "6px", marginBottom: "20px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                        {roomCode ? t.ROOM_CODE : t.CONNECTING}
                    </div>
                    {roomCode && (
                        <div style={{
                            fontSize: "clamp(28px, 7vw, 42px)", letterSpacing: "12px",
                            color: "#e0c88a", fontFamily: "'Cinzel Decorative', serif",
                            textAlign: "center", marginBottom: 20,
                            textShadow: "0 0 20px rgba(197,160,89,0.5)",
                            cursor: "pointer",
                        }}
                            onClick={() => navigator.clipboard?.writeText(roomCode)}
                            title="Click to copy"
                        >
                            {roomCode}
                        </div>
                    )}
                    <div style={{
                        color: "rgba(197,160,89,0.5)", fontSize: "13px", letterSpacing: "3px",
                        textAlign: "center", marginBottom: 10,
                        animation: "loadingPulse 2s ease-in-out infinite",
                    }}>
                        {onlineStatus}
                    </div>
                    {roomCode && (
                        <div style={{ color: "rgba(197,160,89,0.3)", fontSize: "11px", textAlign: "center", marginBottom: 20 }}>
                            {t.SHARE_CODE}
                        </div>
                    )}
                    <div style={{ height: "1px", background: "rgba(197,160,89,0.2)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={() => { setStep("mode"); setRoomCode(""); }} style={{ fontSize: "16px", opacity: 0.6, border: "none", background: "transparent" }}>
                        <span className="menu-icon">←</span>
                        {t.CANCEL}
                    </button>
                </>
            )}

            {step === "side" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.6)", fontSize: "16px", letterSpacing: "6px", marginBottom: "30px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                        {t.CHOOSE_SIDE}
                    </div>
                    <button className="menu-item" onClick={() => { setSide("w"); setStep("difficulty"); }}>
                        <span className="menu-icon">👼</span>
                        {t.ANGELS}
                    </button>
                    <button className="menu-item" onClick={() => { setSide("b"); setStep("difficulty"); }}>
                        <span className="menu-icon">😈</span>
                        {t.DEMONS}
                    </button>
                    <div style={{ height: "1px", background: "rgba(197,160,89,0.2)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={() => setStep("mode")} style={{ fontSize: "16px", opacity: 0.6, border: "none", background: "transparent" }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}

            {step === "difficulty" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.6)", fontSize: "16px", letterSpacing: "6px", marginBottom: "30px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                        {t.CHOOSE_DIFF}
                    </div>

                    {[
                        { id: "RECRUIT", label: t.DIFF_1, icon: "🌿", desc: t.DIFF_1_DESC, col: "#00ffff" },
                        { id: "SOLDIER", label: t.DIFF_2, icon: "⚔", desc: t.DIFF_2_DESC, col: "#c5a059" },
                        { id: "COMMANDER", label: t.DIFF_3, icon: "💀", desc: t.DIFF_3_DESC, col: "#ff0044" },
                        { id: "GRANDMASTER", label: t.DIFF_4, icon: "🧠", desc: t.DIFF_4_DESC, col: "#bf5af2" },
                    ].map(({ id, label, icon, desc, col }) => (
                        <button
                            key={id}
                            onClick={() => setDiff(id)}
                            style={{
                                width: "100%",
                                background: diff === id ? `${col}18` : "rgba(5,1,10,0.4)",
                                border: `1px solid ${diff === id ? col : "rgba(197,160,89,0.2)"}`,
                                color: diff === id ? col : "rgba(197,160,89,0.65)",
                                padding: "18px 28px",
                                marginBottom: "12px",
                                fontFamily: "'Cinzel', serif",
                                letterSpacing: "4px",
                                fontSize: "18px",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                gap: "20px",
                                transition: "all 0.2s",
                                boxShadow: diff === id ? `0 0 20px ${col}33` : "none",
                                cursor: "pointer",
                                backdropFilter: "blur(4px)",
                            }}
                        >
                            <span style={{ fontSize: "26px" }}>{icon}</span>
                            <div>
                                <div style={{ fontWeight: 700 }}>{label}</div>
                                <div style={{ fontSize: "13px", opacity: 0.7, letterSpacing: "1.5px", marginTop: "4px" }}>{desc}</div>
                            </div>
                            {diff === id && <span style={{ marginLeft: "auto", fontSize: "14px", fontWeight: 700 }}>✦ {t.SELECTED}</span>}
                        </button>
                    ))}

                    <div style={{ height: "1px", background: "rgba(197,160,89,0.2)", margin: "24px 0" }} />
                    <button
                        onClick={() => onStart({ mode: "ai", diff, side })}
                        style={{
                            width: "100%",
                            background: "rgba(197,160,89,0.25)",
                            border: "1px solid #c5a059",
                            color: "#c5a059",
                            padding: "22px",
                            cursor: "pointer",
                            fontFamily: "'Cinzel', serif",
                            fontSize: "24px",
                            letterSpacing: "6px",
                            fontWeight: 700,
                            marginBottom: "12px",
                            transition: "all 0.2s",
                            textShadow: "0 0 15px rgba(197,160,89,0.6)",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(197,160,89,0.35)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(197,160,89,0.25)"}
                    >
                        ⚔ {t.START_BATTLE}
                    </button>
                    <button className="menu-item" onClick={() => setStep("side")} style={{ fontSize: "16px", opacity: 0.6, border: "none", background: "transparent" }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}
        </div>
    );
}
