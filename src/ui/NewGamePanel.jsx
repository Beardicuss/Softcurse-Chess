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
        <div className="sub-panel" style={{ width: "100%", textAlign: "left", paddingRight: "10px" }}>
            {step === "mode" && (
                <>
                    <div style={{ color: "#c8cdd4", fontSize: "clamp(26px, 5vw, 36px)", letterSpacing: "4px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, textShadow: "0 0 20px rgba(140,160,190,0.2)" }}>
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
                    <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.15), transparent)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={onBack} style={{ fontSize: "15px", opacity: 0.6 }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}

            {step === "lobby" && (
                <>
                    <div style={{ color: "#c8cdd4", fontSize: "clamp(26px, 5vw, 36px)", letterSpacing: "4px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, textShadow: "0 0 20px rgba(140,160,190,0.2)" }}>
                        {t.ONLINE_PVP || "ONLINE LOBBY"}
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginBottom: "16px", width: "100%" }}>
                        <button
                            className="hud-btn"
                            style={{ flex: 1, padding: "12px", background: "rgba(8,12,20,0.6)", borderColor: "rgba(200,210,220,0.2)", color: "#c8cdd4", letterSpacing: "2px" }}
                            onClick={() => handleModeSelect("online_create")}>
                            ➕ PRIVATE
                        </button>
                        <button
                            className="hud-btn"
                            style={{ flex: 1, padding: "12px", background: "rgba(8,12,20,0.6)", borderColor: "rgba(200,210,220,0.2)", color: "#c8cdd4", letterSpacing: "2px" }}
                            onClick={() => handleModeSelect("online_join")}>
                            🔗 JOIN
                        </button>
                    </div>

                    <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.1), transparent)", margin: "16px 0", width: "100%" }} />

                    <div style={{ maxHeight: "35vh", overflowY: "auto", paddingRight: "4px", width: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {MYTH_ROOMS.map(r => (
                            <button
                                key={r}
                                className="menu-item"
                                style={{ fontSize: "14px", padding: "10px 16px", margin: 0, gap: "12px" }}
                                onClick={() => handleJoinNamedRoom(r)}>
                                <span className="menu-icon" style={{ opacity: 0.5, fontSize: "16px", minWidth: "20px" }}>🏛</span> {r} <span style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.3, letterSpacing: "1px" }}>PUBLIC</span>
                            </button>
                        ))}
                    </div>

                    <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.15), transparent)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={() => setStep("mode")} style={{ fontSize: "15px", opacity: 0.6 }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}

            {step === "join" && (
                <>
                    <div style={{ color: "#c8cdd4", fontSize: "clamp(26px, 5vw, 36px)", letterSpacing: "4px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, textShadow: "0 0 20px rgba(140,160,190,0.2)" }}>
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
                            background: "rgba(5,8,18,0.7)", border: "1px solid rgba(200,210,220,0.2)",
                            borderLeft: "3px solid #c8cdd4",
                            color: "#c8cdd4", fontSize: "24px", letterSpacing: "12px",
                            fontFamily: "'Cinzel', serif", textAlign: "center",
                            outline: "none", transition: "all 0.3s"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "rgba(197,160,89,0.5)"}
                        onBlur={(e) => e.target.style.borderColor = "rgba(200,210,220,0.2)"}
                        onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                        autoFocus
                    />
                    <button className="menu-item" onClick={handleJoinRoom}>
                        <span className="menu-icon">▶</span>
                        {t.JOIN}
                    </button>
                    <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.15), transparent)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={() => setStep("mode")} style={{ fontSize: "15px", opacity: 0.6 }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}

            {step === "waiting" && (
                <>
                    <div style={{ color: "#c8cdd4", fontSize: "clamp(26px, 5vw, 36px)", letterSpacing: "4px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, textShadow: "0 0 20px rgba(140,160,190,0.2)" }}>
                        {roomCode ? t.ROOM_CODE : t.CONNECTING}
                    </div>
                    {roomCode && (
                        <div style={{
                            fontSize: "clamp(32px, 8vw, 48px)", letterSpacing: "12px",
                            color: "#c5a059", fontFamily: "'Cinzel Decorative', serif",
                            textAlign: "left", marginBottom: 20,
                            textShadow: "0 0 20px rgba(197,160,89,0.3)",
                            cursor: "pointer",
                        }}
                            onClick={() => navigator.clipboard?.writeText(roomCode)}
                            title="Click to copy"
                        >
                            {roomCode}
                        </div>
                    )}
                    <div style={{
                        color: "rgba(200,210,220,0.6)", fontSize: "14px", letterSpacing: "4px",
                        textAlign: "left", marginBottom: 10,
                        animation: "loadingPulse 2s ease-in-out infinite",
                        fontFamily: "'Cinzel', serif"
                    }}>
                        {onlineStatus}
                    </div>
                    {roomCode && (
                        <div style={{ color: "rgba(200,210,220,0.4)", fontSize: "11px", textAlign: "left", marginBottom: 20, letterSpacing: "1px" }}>
                            {t.SHARE_CODE}
                        </div>
                    )}
                    <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.15), transparent)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={() => { setStep("mode"); setRoomCode(""); }} style={{ fontSize: "15px", opacity: 0.6 }}>
                        <span className="menu-icon">←</span>
                        {t.CANCEL}
                    </button>
                </>
            )}

            {step === "side" && (
                <>
                    <div style={{ color: "#c8cdd4", fontSize: "clamp(26px, 5vw, 36px)", letterSpacing: "4px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, textShadow: "0 0 20px rgba(140,160,190,0.2)" }}>
                        {t.CHOOSE_SIDE}
                    </div>
                    <button className="menu-item" onClick={() => { setSide("w"); setStep("difficulty"); }}>
                        <span className="menu-icon" style={{ filter: "grayscale(1) brightness(1.5)" }}>♙</span>
                        {t.ANGELS}
                    </button>
                    <button className="menu-item" onClick={() => { setSide("b"); setStep("difficulty"); }}>
                        <span className="menu-icon" style={{ filter: "grayscale(1) brightness(0.6)" }}>♟</span>
                        {t.DEMONS}
                    </button>
                    <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.15), transparent)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={() => setStep("mode")} style={{ fontSize: "15px", opacity: 0.6 }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}

            {step === "difficulty" && (
                <>
                    <div style={{ color: "#c8cdd4", fontSize: "clamp(26px, 5vw, 36px)", letterSpacing: "4px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, textShadow: "0 0 20px rgba(140,160,190,0.2)" }}>
                        {t.CHOOSE_DIFF}
                    </div>

                    {[
                        { id: "RECRUIT", label: t.DIFF_1, icon: "⚔", desc: t.DIFF_1_DESC, col: "#8ca0be" },
                        { id: "SOLDIER", label: t.DIFF_2, icon: "🛡", desc: t.DIFF_2_DESC, col: "#c8cdd4" },
                        { id: "COMMANDER", label: t.DIFF_3, icon: "⚜", desc: t.DIFF_3_DESC, col: "#e0c88a" },
                        { id: "GRANDMASTER", label: t.DIFF_4, icon: "👁", desc: t.DIFF_4_DESC, col: "#c5a059" },
                    ].map(({ id, label, icon, desc, col }) => (
                        <div
                            key={id}
                            onClick={() => setDiff(id)}
                            style={{
                                width: "100%",
                                background: diff === id ? `linear-gradient(90deg, ${col}15, transparent)` : "transparent",
                                borderLeft: `3px solid ${diff === id ? col : "transparent"}`,
                                color: diff === id ? col : "rgba(200,210,220,0.5)",
                                padding: "14px 20px",
                                marginBottom: "8px",
                                fontFamily: "'Cinzel', serif",
                                letterSpacing: "3px",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                                transition: "all 0.3s ease",
                                cursor: "pointer",
                            }}
                            onMouseEnter={e => {
                                if (diff !== id) e.currentTarget.style.background = "rgba(200,210,220,0.03)";
                            }}
                            onMouseLeave={e => {
                                if (diff !== id) e.currentTarget.style.background = "transparent";
                            }}
                        >
                            <span style={{ fontSize: "24px", opacity: diff === id ? 1 : 0.6, width: "32px", textAlign: "center" }}>{icon}</span>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: "16px", textTransform: "uppercase" }}>{label}</div>
                                <div style={{ fontSize: "12px", opacity: diff === id ? 0.8 : 0.5, letterSpacing: "1px", marginTop: "4px", textTransform: "none", fontFamily: "sans-serif" }}>{desc}</div>
                            </div>
                        </div>
                    ))}

                    <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.15), transparent)", margin: "24px 0" }} />
                    <button
                        onClick={() => onStart({ mode: "ai", diff, side })}
                        className="hud-btn"
                        style={{
                            width: "200px",
                            background: "transparent",
                            borderColor: "#c5a059",
                            color: "#c5a059",
                            padding: "16px",
                            fontSize: "16px",
                            letterSpacing: "4px",
                            fontWeight: 700,
                            marginBottom: "16px",
                            boxShadow: "0 0 15px rgba(197,160,89,0.1)",
                        }}
                    >
                        {t.START_BATTLE}
                    </button>
                    <button className="menu-item" onClick={() => setStep("side")} style={{ fontSize: "15px", opacity: 0.6 }}>
                        <span className="menu-icon">←</span>
                        {t.BACK}
                    </button>
                </>
            )}
        </div>
    );
}
