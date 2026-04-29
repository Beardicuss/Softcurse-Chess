import { useState, useEffect, useRef } from "react";
import { W, B } from "./chessEngine.js";
import { SYM_W, SYM_B, ASSET_CDN } from "./constants.js";

// ═══════════════════════════════════════════════════════════════
//  CHESS UI — Main Menu + HUD overlay
// ═══════════════════════════════════════════════════════════════

const PROMO_OPTS = [
    { t: "Q", sym: ["♕", "♛"], label: "QUEEN" },
    { t: "R", sym: ["♖", "♜"], label: "ROOK" },
    { t: "B", sym: ["♗", "♝"], label: "BISHOP" },
    { t: "N", sym: ["♘", "♞"], label: "KNIGHT" },
];

// ── Keyframe injection ───────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&display=swap');

  @keyframes spin { to { transform: rotate(360deg); } }

  @keyframes menuFadeIn {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes titleGlow {
    0%, 100% { text-shadow: 0 0 20px rgba(197,160,89,.5), 0 0 60px rgba(197,160,89,.15); }
    50%       { text-shadow: 0 0 30px rgba(197,160,89,.85), 0 0 80px rgba(197,160,89,.3), 0 0 120px rgba(197,160,89,.1); }
  }

  @keyframes subtitlePulse {
    0%, 100% { opacity: 0.5; letter-spacing: 8px; }
    50%       { opacity: 0.8; letter-spacing: 10px; }
  }

  @keyframes lineExpand {
    from { width: 0; }
    to   { width: 100%; }
  }

  @keyframes hudSlideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes hudSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes orbitSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  @keyframes crestPulse {
    0%, 100% { opacity: 0.15; transform: scale(1); }
    50%       { opacity: 0.28; transform: scale(1.03); }
  }

  .menu-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 18px 36px;
    cursor: pointer;
    border: 1px solid rgba(197,160,89,0.1);
    background: rgba(5,1,10,0.4);
    color: rgba(197,160,89,0.75);
    font-family: 'Cinzel', serif;
    font-size: 20px;
    letter-spacing: 6px;
    transition: all 0.25s ease;
    text-align: left;
    width: 100%;
    font-weight: 600;
    margin-bottom: 12px;
    backdrop-filter: blur(4px);
  }

  .menu-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 100%;
    background: linear-gradient(90deg, rgba(197,160,89,0.12), transparent);
    transition: width 0.3s ease;
  }

  .menu-item:hover::before { width: 100%; }

  .menu-item:hover {
    color: #c5a059;
    border-color: rgba(197,160,89,0.4);
    letter-spacing: 7px;
    text-shadow: 0 0 15px rgba(197,160,89,0.5);
    transform: translateX(5px);
    background: rgba(197,160,89,0.05);
  }

  .menu-item.disabled {
    opacity: 0.2;
    cursor: not-allowed;
    pointer-events: none;
  }

  .menu-icon {
    font-size: 24px;
    opacity: 0.8;
    min-width: 32px;
    transition: transform 0.25s ease;
  }

  .menu-item:hover .menu-icon {
    transform: scale(1.1);
    opacity: 1;
  }

  .sub-panel {
    animation: menuFadeIn 0.3s ease forwards;
  }

  .diff-btn {
    background: transparent;
    border: 1px solid rgba(197,160,89,0.2);
    color: rgba(197,160,89,0.5);
    padding: 8px 18px;
    font-family: 'Cinzel', serif;
    font-size: 12px;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .diff-btn:hover, .diff-btn.active {
    background: rgba(197,160,89,0.12);
    border-color: rgba(197,160,89,0.6);
    color: #c5a059;
  }

  .hud-btn {
    background: transparent;
    border: 1px solid rgba(197,160,89,0.3);
    color: rgba(197,160,89,0.7);
    padding: 6px 14px;
    font-size: 13px;
    letter-spacing: 2px;
    cursor: pointer;
    font-family: 'Cinzel', serif;
    transition: all 0.2s;
  }

  .hud-btn:hover {
    background: rgba(197,160,89,0.15);
    color: #c5a059;
    border-color: rgba(197,160,89,0.6);
  }
`;

// ── Decorative crest SVG ─────────────────────────────────────
function Crest() {
    return (
        <svg width="220" height="220" viewBox="0 0 180 180" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", animation: "crestPulse 4s ease-in-out infinite", pointerEvents: "none" }}>
            <circle cx="90" cy="90" r="85" fill="none" stroke="rgba(197,160,89,0.3)" strokeWidth="0.5" strokeDasharray="4 6" />
            <circle cx="90" cy="90" r="70" fill="none" stroke="rgba(197,160,89,0.15)" strokeWidth="0.5" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                <line key={a}
                    x1={90 + 68 * Math.cos(a * Math.PI / 180)}
                    y1={90 + 68 * Math.sin(a * Math.PI / 180)}
                    x2={90 + 85 * Math.cos(a * Math.PI / 180)}
                    y2={90 + 85 * Math.sin(a * Math.PI / 180)}
                    stroke="rgba(197,160,89,0.4)" strokeWidth="1"
                />
            ))}
            <polygon points="90,20 96,34 111,34 100,43 104,57 90,48 76,57 80,43 69,34 84,34"
                fill="none" stroke="rgba(197,160,89,0.3)" strokeWidth="0.8" />
        </svg>
    );
}

// ── New Game sub-panel ───────────────────────────────────────
function NewGamePanel({ onStart, onBack }) {
    const [step, setStep] = useState("mode"); // "mode" | "side" | "difficulty"
    const [mode, setMode] = useState(null);
    const [side, setSide] = useState("w"); // "w" (Angels) | "b" (Demons)
    const [diff, setDiff] = useState("SOLDIER");

    const handleModeSelect = (m) => {
        setMode(m);
        if (m === "pvp") {
            onStart({ mode: "pvp", diff: null });
        } else if (m === "ai_vs_ai") {
            onStart({ mode: "ai_vs_ai", diff: "GRANDMASTER" });
        } else {
            setStep("side");
        }
    };

    return (
        <div className="sub-panel" style={{ width: "100%" }}>
            {step === "mode" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.6)", fontSize: "16px", letterSpacing: "6px", marginBottom: "30px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                        SELECT MODE
                    </div>
                    <button className="menu-item" onClick={() => handleModeSelect("ai")}>
                        <span className="menu-icon">🤖</span>
                        PLAYER VS AI
                    </button>
                    <button className="menu-item" onClick={() => handleModeSelect("pvp")}>
                        <span className="menu-icon">⚔</span>
                        PLAYER VS PLAYER
                    </button>
                    <button className="menu-item" onClick={() => handleModeSelect("ai_vs_ai")}>
                        <span className="menu-icon">📽</span>
                        AI VS AI
                    </button>
                    <div style={{ height: "1px", background: "rgba(197,160,89,0.2)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={onBack} style={{ fontSize: "16px", opacity: 0.6, border: "none", background: "transparent" }}>
                        <span className="menu-icon">←</span>
                        BACK
                    </button>
                </>
            )}

            {step === "side" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.6)", fontSize: "16px", letterSpacing: "6px", marginBottom: "30px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                        CHOOSE YOUR SIDE
                    </div>
                    <button className="menu-item" onClick={() => { setSide("w"); setStep("difficulty"); }}>
                        <span className="menu-icon">👼</span>
                        ANGELS (WHITE)
                    </button>
                    <button className="menu-item" onClick={() => { setSide("b"); setStep("difficulty"); }}>
                        <span className="menu-icon">😈</span>
                        DEMONS (BLACK)
                    </button>
                    <div style={{ height: "1px", background: "rgba(197,160,89,0.2)", margin: "24px 0" }} />
                    <button className="menu-item" onClick={() => setStep("mode")} style={{ fontSize: "16px", opacity: 0.6, border: "none", background: "transparent" }}>
                        <span className="menu-icon">←</span>
                        BACK
                    </button>
                </>
            )}

            {step === "difficulty" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.6)", fontSize: "16px", letterSpacing: "6px", marginBottom: "30px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                        CHOOSE DIFFICULTY
                    </div>

                    {[
                        { key: "RECRUIT", icon: "🌿", desc: "Casual — for learning", col: "#00ffff" },
                        { key: "SOLDIER", icon: "⚔", desc: "Balanced — fair challenge", col: "#c5a059" },
                        { key: "COMMANDER", icon: "💀", desc: "Brutal — may take 3–8s/move", col: "#ff0044" },
                        { key: "GRANDMASTER", icon: "🧠", desc: "Cloud AI — real neural engine", col: "#bf5af2" },
                    ].map(({ key, icon, desc, col }) => (
                        <button
                            key={key}
                            onClick={() => setDiff(key)}
                            style={{
                                width: "100%",
                                background: diff === key ? `${col}18` : "rgba(5,1,10,0.4)",
                                border: `1px solid ${diff === key ? col : "rgba(197,160,89,0.2)"}`,
                                color: diff === key ? col : "rgba(197,160,89,0.65)",
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
                                boxShadow: diff === key ? `0 0 20px ${col}33` : "none",
                                cursor: "pointer",
                                backdropFilter: "blur(4px)",
                            }}
                        >
                            <span style={{ fontSize: "26px" }}>{icon}</span>
                            <div>
                                <div style={{ fontWeight: 700 }}>{key}</div>
                                <div style={{ fontSize: "13px", opacity: 0.7, letterSpacing: "1.5px", marginTop: "4px" }}>{desc}</div>
                            </div>
                            {diff === key && <span style={{ marginLeft: "auto", fontSize: "14px", fontWeight: 700 }}>✦ SELECTED</span>}
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
                        ⚔ START BATTLE
                    </button>
                    <button className="menu-item" onClick={() => setStep("side")} style={{ fontSize: "16px", opacity: 0.6, border: "none", background: "transparent" }}>
                        <span className="menu-icon">←</span>
                        BACK
                    </button>
                </>
            )}
        </div>
    );
}

// ── Credits panel ────────────────────────────────────────────
function CreditsPanel({ onBack }) {
    return (
        <div className="sub-panel" style={{ width: "100%", textAlign: "center" }}>
            <div style={{ color: "rgba(197,160,89,0.5)", fontSize: "14px", letterSpacing: "5px", marginBottom: "30px", fontFamily: "'Cinzel Decorative', serif", fontWeight: 700 }}>CREDITS</div>
            <div style={{ color: "rgba(197,160,89,0.8)", fontSize: "15px", lineHeight: 2.4, letterSpacing: "2.5px", fontFamily: "'Cinzel', serif" }}>
                <div style={{ color: "#c5a059", fontSize: "18px", marginBottom: "6px", fontWeight: 700 }}>SOFTCURSE LAB</div>
                <div style={{ opacity: 0.6, fontSize: "13px", marginBottom: "24px" }}>SOLE DEVELOPER & DESIGNER</div>
                <div style={{ opacity: 0.5, fontSize: "12px", letterSpacing: "1.5px" }}>3D Models — Creality Cloud Community</div>
                <div style={{ opacity: 0.5, fontSize: "12px", letterSpacing: "1.5px" }}>Textures — AmbientCG (CC0)</div>
                <div style={{ opacity: 0.5, fontSize: "12px", letterSpacing: "1.5px" }}>Engine — Three.js + React</div>
            </div>
            <div style={{ height: "1px", background: "rgba(197,160,89,0.15)", margin: "30px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "14px", opacity: 0.6, justifyContent: "center", border: "none", background: "transparent" }}>
                <span className="menu-icon">←</span>
                BACK
            </button>
        </div>
    );
}

// ── How to Play panel ────────────────────────────────────────
function HowToPlayPanel({ onBack }) {
    const tips = [
        ["LEFT CLICK", "Select a piece"],
        ["LEFT CLICK DOT", "Move to square"],
        ["RIGHT DRAG", "Orbit camera"],
        ["SCROLL", "Zoom in / out"],
        ["UNDO", "Take back last move"],
        ["NEW GAME", "Reset the board"],
    ];
    return (
        <div className="sub-panel" style={{ width: "100%" }}>
            <div style={{ color: "rgba(197,160,89,0.5)", fontSize: "14px", letterSpacing: "5px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>HOW TO PLAY</div>
            {tips.map(([key, val]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid rgba(197,160,89,0.1)", fontFamily: "'Cinzel', serif" }}>
                    <span style={{ color: "#c5a059", fontSize: "13px", letterSpacing: "2.5px", fontWeight: 700 }}>{key}</span>
                    <span style={{ color: "rgba(197,160,89,0.6)", fontSize: "13px" }}>{val}</span>
                </div>
            ))}
            <div style={{ height: "1px", background: "rgba(197,160,89,0.15)", margin: "20px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "14px", opacity: 0.6, border: "none", background: "transparent" }}>
                <span className="menu-icon">←</span>
                BACK
            </button>
        </div>
    );
}

// ── Settings panel ───────────────────────────────────────────
function SettingsPanel({ onBack }) {
    return (
        <div className="sub-panel" style={{ width: "100%" }}>
            <div style={{ color: "rgba(197,160,89,0.5)", fontSize: "14px", letterSpacing: "5px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>SETTINGS</div>

            <div style={{ marginBottom: "20px" }}>
                <div style={{ color: "#c5a059", fontSize: "13px", letterSpacing: "3px", marginBottom: "12px", fontWeight: 700 }}>AUDIO</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ color: "rgba(197,160,89,0.8)", fontSize: "13px" }}>MASTER</span>
                    <input type="range" min="0" max="100" defaultValue="100" style={{ width: "120px", accentColor: "#c5a059" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ color: "rgba(197,160,89,0.8)", fontSize: "13px" }}>MUSIC</span>
                    <input type="range" min="0" max="100" defaultValue="80" style={{ width: "120px", accentColor: "#c5a059" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(197,160,89,0.8)", fontSize: "13px" }}>SFX</span>
                    <input type="range" min="0" max="100" defaultValue="100" style={{ width: "120px", accentColor: "#c5a059" }} />
                </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <div style={{ color: "#c5a059", fontSize: "13px", letterSpacing: "3px", marginBottom: "12px", fontWeight: 700 }}>LANGUAGE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {["ENGLISH", "РУССКИЙ", "ქართული"].map((l, i) => (
                        <label key={l} style={{ display: "flex", alignItems: "center", gap: "12px", color: "rgba(197,160,89,0.8)", fontSize: "13px", cursor: "pointer" }}>
                            <input type="radio" name="lang" defaultChecked={i === 0} style={{ accentColor: "#c5a059", width: "16px", height: "16px" }} />
                            {l}
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ height: "1px", background: "rgba(197,160,89,0.15)", margin: "20px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "14px", opacity: 0.6, border: "none", background: "transparent" }}>
                <span className="menu-icon">←</span>
                BACK
            </button>
        </div>
    );
}

// ── Main Menu overlay ────────────────────────────────────────
function MainMenu({ onStart, hasSave }) {
    const [panel, setPanel] = useState("main"); // "main" | "newgame" | "credits" | "howtoplay"
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 200);
        return () => clearTimeout(t);
    }, []);

    const MENU_ITEMS = [
        { label: "NEW GAME", icon: "⚔", panel: "newgame", delay: 0 },
        { label: "CONTINUE", icon: "▶", panel: "continue", delay: 80, disabled: !hasSave },
        { label: "HOW TO PLAY", icon: "📖", panel: "howtoplay", delay: 160 },
        { label: "SETTINGS", icon: "⚙", panel: "settings", delay: 240 },
        { label: "CREDITS", icon: "✦", panel: "credits", delay: 320 },
        { label: "EXIT", icon: "⏏", panel: "exit", delay: 400 },
    ];

    return (
        <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50,
            background: "radial-gradient(ellipse at center, rgba(5,1,10,0.7) 0%, rgba(5,1,10,0.92) 100%)",
            backdropFilter: "blur(3px)",
        }}>
            <div style={{
                position: "relative",
                width: 440,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: visible ? 1 : 0,
                transition: "opacity 0.6s ease",
            }}>
                {/* Decorative background crest */}
                <div style={{ position: "relative", width: 220, height: 220, marginBottom: -80 }}>
                    <Crest />
                </div>

                {/* Title block */}
                <div style={{ textAlign: "center", marginBottom: "50px", position: "relative", zIndex: 1 }}>
                    <div style={{
                        fontFamily: "'Cinzel Decorative', serif",
                        fontSize: "72px",
                        fontWeight: 900,
                        color: "#c5a059",
                        letterSpacing: "8px",
                        animation: "titleGlow 3s ease-in-out infinite",
                        lineHeight: 1.1,
                    }}>
                        SOFTCURSE'S
                    </div>
                    <div style={{
                        fontFamily: "'Cinzel Decorative', serif",
                        fontSize: "96px",
                        fontWeight: 900,
                        color: "#e0c88a",
                        letterSpacing: "6px",
                        animation: "titleGlow 3s ease-in-out infinite",
                        lineHeight: 1.0,
                    }}>
                        CHESS
                    </div>
                    <div style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: "22px",
                        color: "rgba(197,160,89,0.85)",
                        letterSpacing: "12px",
                        marginTop: "24px",
                        animation: "subtitlePulse 4s ease-in-out infinite",
                        fontWeight: 700,
                    }}>
                        ANGELS VS DEMONS
                    </div>

                    {/* Decorative line */}
                    <div style={{ position: "relative", height: "1px", margin: "24px 0", overflow: "hidden" }}>
                        <div style={{
                            position: "absolute", left: "50%", transform: "translateX(-50%)",
                            height: "1px", background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.7), transparent)",
                            animation: visible ? "lineExpand 1s ease forwards" : "none",
                            width: "100%",
                        }} />
                    </div>
                </div>

                {/* Menu box */}
                <div style={{
                    position: "relative",
                    width: "100%",
                    padding: "10px 0",
                }}>
                    {/* Main menu items */}
                    {panel === "main" && MENU_ITEMS.map(({ label, icon, panel: p, delay, disabled }) => (
                        <button
                            key={label}
                            className={`menu-item${disabled ? " disabled" : ""}`}
                            style={{
                                animation: visible ? `menuFadeIn 0.5s ease ${delay}ms forwards` : "none",
                                opacity: 0,
                            }}
                            onClick={() => {
                                if (p === "continue") { onStart(null); }
                                else if (p === "exit") { window.close(); }
                                else setPanel(p);
                            }}
                        >
                            <span className="menu-icon">{icon}</span>
                            {label}
                            {disabled && <span style={{ marginLeft: "auto", fontSize: "12px", opacity: 0.4 }}>NO SAVE</span>}
                        </button>
                    ))}

                    {/* Sub panels */}
                    {panel === "newgame" && <NewGamePanel onStart={onStart} onBack={() => setPanel("main")} />}
                    {panel === "credits" && <CreditsPanel onBack={() => setPanel("main")} />}
                    {panel === "howtoplay" && <HowToPlayPanel onBack={() => setPanel("main")} />}
                    {panel === "settings" && <SettingsPanel onBack={() => setPanel("main")} />}
                </div>

                <div style={{
                    marginTop: "24px",
                    fontFamily: "'Cinzel', serif",
                    fontSize: "12px",
                    color: "rgba(197,160,89,0.3)",
                    letterSpacing: "4px",
                    fontWeight: 600,
                }}>
                    SOFTCURSE STUDIO © 2026
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export default function ChessUI({
    mountRef, msg, caps, moveCount, mode, diff, thinking, promoModal,
    moveLog, logOpen, logRef,
    setModeFixed, setDiffFixed, setLogOpen,
    gameStarted, onMenuStart,
}) {
    const isWt = msg.includes("WHITE");
    const mc = msg.includes("WINS") ? "#c5a059"
        : msg.includes("CHECK") && !msg.includes("CHECKMATE") ? "#5f0505"
            : isWt ? "#efe6a0" : "#5f0505";

    const hasSave = !!localStorage.getItem("battleChessSave");
    const [paused, setPaused] = useState(false);
    const [showIntro, setShowIntro] = useState(true);

    useEffect(() => {
        if (!showIntro) return;
        const onAny = () => setShowIntro(false);
        window.addEventListener("keydown", onAny);
        window.addEventListener("mousedown", onAny);
        return () => {
            window.removeEventListener("keydown", onAny);
            window.removeEventListener("mousedown", onAny);
        };
    }, [showIntro]);

    useEffect(() => {
        if (!gameStarted) return;
        const onKd = (e) => {
            if (e.key === "Escape") setPaused(p => !p);
        };
        window.addEventListener("keydown", onKd);
        return () => window.removeEventListener("keydown", onKd);
    }, [gameStarted]);

    return (
        <div style={{
            width: "100%", height: "100vh",
            background: "#05010a",
            fontFamily: "'Cinzel', serif",
            position: "relative", overflow: "hidden",
            userSelect: "none",
        }}>
            {/* ── INTRO FLASH SCREEN ────────────────────────────── */}
            {showIntro && (
                <div style={{
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                    zIndex: 9999, background: "#000",
                }}>
                    <video
                        src={`${ASSET_CDN}/flash_screen.mp4`}
                        autoPlay
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onEnded={() => setShowIntro(false)}
                    />
                    <div style={{
                        position: "absolute", bottom: 40, width: "100%", textAlign: "center",
                        color: "rgba(197,160,89,0.5)", fontSize: "12px", letterSpacing: "4px",
                    }}>
                        PRESS ANY KEY TO SKIP
                    </div>
                </div>
            )}
            {/* Inject styles */}
            <style>{STYLES}</style>

            {/* Three.js canvas mount */}
            <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

            {/* ── MAIN MENU ─────────────────────────────────────── */}
            {!gameStarted && (
                <MainMenu
                    hasSave={hasSave}
                    onStart={(cfg) => onMenuStart(cfg)}
                />
            )}

            {/* ── HUD (only when game started) ──────────────────── */}
            {gameStarted && (
                <>
                    {paused && (
                        <div style={{
                            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                            background: "rgba(5,1,10,0.85)", backdropFilter: "blur(4px)",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            zIndex: 100,
                        }}>
                            <div style={{ color: "#c5a059", fontSize: "32px", letterSpacing: "8px", fontFamily: "'Cinzel Decorative', serif", marginBottom: 40, textShadow: "0 0 20px rgba(197,160,89,0.5)" }}>PAUSED</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 15, width: 260 }}>
                                <button className="menu-item" onClick={() => setPaused(false)}>▶ RESUME</button>
                                <button className="menu-item" onClick={() => { window._battleChessExitToMenu?.(); setPaused(false); }}>⧉ MAIN MENU</button>
                                <button className="menu-item" onClick={() => window.close()}>⏏ EXIT TO DESKTOP</button>
                            </div>
                        </div>
                    )}

                    {/* Top bar */}
                    <div style={{
                        position: "absolute", top: 0, left: 0, right: 0,
                        padding: "14px 20px",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        pointerEvents: "none",
                        background: "linear-gradient(180deg,rgba(5,1,10,.93) 0%,transparent 100%)",
                        animation: "hudSlideDown 0.5s ease forwards",
                    }}>
                        {/* Left — title */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: 2, height: 32, background: "#c5a059", boxShadow: "0 0 8px #c5a059" }} />
                            <div>
                                <div style={{ color: "#c5a059", fontSize: "13px", letterSpacing: "5px", opacity: 0.75, fontFamily: "'Cinzel Decorative', serif", textTransform: "uppercase" }}>Softcurse's Chess</div>
                                <div style={{ color: "#e0f0ff", fontSize: "20px", letterSpacing: "3px", fontWeight: "bold", textShadow: "0 0 10px rgba(197,160,89,.6)", fontFamily: "'Cinzel Decorative', serif", textTransform: "uppercase" }}>Angels vs Demons</div>
                            </div>
                        </div>

                        {/* Center — status */}
                        <div style={{
                            padding: "10px 26px",
                            border: `1px solid ${thinking ? "#224422" : mc + "44"}`,
                            background: thinking ? "rgba(0,40,20,.4)" : `${mc}11`,
                            color: thinking ? "#00ff88" : mc,
                            fontWeight: "bold",
                            fontSize: "16px", letterSpacing: "2px",
                            textShadow: thinking ? "0 0 8px #00ff88" : `0 0 12px ${mc === "#5f0505" ? "#ff0000" : mc}`,
                            textAlign: "center", minWidth: "290px",
                            transition: "all .3s",
                            fontFamily: "'Cinzel', serif",
                        }}>
                            {thinking ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ display: "inline-block", width: 9, height: 9, border: "1px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .75s linear infinite" }} />
                                    AI COMPUTING…
                                </span>
                            ) : msg}
                        </div>

                        {/* Right — controls */}
                        <div style={{ textAlign: "right", pointerEvents: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                            <div style={{ color: "rgba(197,160,89,.5)", fontSize: "13px", letterSpacing: "2px", fontFamily: "'Cinzel Decorative', serif" }}>MOVE {moveCount}</div>
                            <div style={{ display: "flex", gap: "5px" }}>
                                <button className="hud-btn" onClick={() => window._battleChessUndo?.()}>↩ UNDO</button>
                                <button className="hud-btn" style={{ borderColor: "rgba(197,160,89,.6)", color: "#c5a059" }} onClick={() => window._battleChessReset?.()}>NEW GAME</button>
                            </div>
                        </div>
                    </div>

                    {/* Move Log Panel */}
                    <div style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", display: "flex", alignItems: "center", zIndex: 10 }}>
                        <button onClick={() => setLogOpen(o => !o)} style={{ background: "rgba(5,1,10,.88)", border: "1px solid rgba(197,160,89,.3)", borderLeft: "none", color: "#c5a059", padding: "16px 6px", fontSize: "11px", letterSpacing: "3px", cursor: "pointer", fontFamily: "'Cinzel Decorative', serif", writingMode: "vertical-rl", textOrientation: "mixed", lineHeight: 1 }}>
                            {logOpen ? "◀ LOG" : "▶ LOG"}
                        </button>
                        {logOpen && (
                            <div style={{ background: "rgba(5,1,10,.95)", border: "1px solid rgba(197,160,89,.25)", borderLeft: "none", width: 230, maxHeight: 400, display: "flex", flexDirection: "column" }}>
                                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(197,160,89,.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: "rgba(197,160,89,.6)", fontSize: "12px", letterSpacing: "2.5px", fontFamily: "'Cinzel Decorative', serif" }}>MOVE LOG</span>
                                    <span style={{ color: "rgba(197,160,89,.3)", fontSize: "11px" }}>{moveLog.length} pairs</span>
                                </div>
                                <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
                                    {moveLog.map((m, i) => (
                                        <div key={i} style={{ display: "flex", fontSize: "12px", letterSpacing: "1px", marginBottom: "6px", fontFamily: "monospace" }}>
                                            <span style={{ color: "rgba(197,160,89,.3)", width: 30 }}>{i + 1}.</span>
                                            <span style={{ color: "#efe6a0", width: 80 }}>{m.w}</span>
                                            <span style={{ color: "#7a3232" }}>{m.b || "..."}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Captured pieces */}
                    <div style={{ position: "absolute", bottom: 20, left: 20, display: "flex", flexDirection: "column", gap: 10, animation: "hudSlideUp 0.5s ease forwards" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 200 }}>
                            {caps.w.map((t, i) => <span key={i} style={{ color: "#c5a059", fontSize: "20px", textShadow: "0 0 8px rgba(197,160,89,.4)" }}>{SYM_W[t]}</span>)}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 200 }}>
                            {caps.b.map((t, i) => <span key={i} style={{ color: "#7a3232", fontSize: "20px", textShadow: "0 0 8px rgba(122,50,50,.4)" }}>{SYM_B[t]}</span>)}
                        </div>
                    </div>

                    {/* Promotion modal */}
                    {promoModal && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(5,1,10,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
                            <div style={{ background: "rgba(5,1,10,.95)", border: "1px solid #c5a059", padding: 30, textAlign: "center" }}>
                                <div style={{ color: "#c5a059", fontSize: "18px", letterSpacing: "4px", marginBottom: 25, fontFamily: "'Cinzel Decorative', serif" }}>PAWN PROMOTION</div>
                                <div style={{ display: "flex", gap: 15 }}>
                                    {PROMO_OPTS.map(o => (
                                        <button key={o.t} onClick={() => window._battleChessPromoChoice?.(o.t)} style={{ background: "rgba(197,160,89,.1)", border: "1px solid rgba(197,160,89,.3)", color: "#c5a059", padding: "15px 20px", cursor: "pointer", transition: "all .2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(197,160,89,.25)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(197,160,89,.1)"}>
                                            <div style={{ fontSize: 32, marginBottom: 5 }}>{o.sym[promoModal.color === W ? 0 : 1]}</div>
                                            <div style={{ fontSize: 10, letterSpacing: 2 }}>{o.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
