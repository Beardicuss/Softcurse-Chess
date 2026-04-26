import { useState, useEffect, useRef } from "react";
import { W } from "./chessEngine.js";
import { SYM_W, SYM_B } from "./constants.js";

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
    gap: 14px;
    padding: 13px 28px;
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(197,160,89,0.6);
    font-family: 'Cinzel', serif;
    font-size: 15px;
    letter-spacing: 4px;
    transition: all 0.25s ease;
    text-align: left;
    width: 100%;
    font-weight: 600;
  }

  .menu-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 100%;
    background: linear-gradient(90deg, rgba(197,160,89,0.08), transparent);
    transition: width 0.3s ease;
  }

  .menu-item:hover::before { width: 100%; }

  .menu-item:hover {
    color: #c5a059;
    border-color: rgba(197,160,89,0.25);
    letter-spacing: 5px;
    text-shadow: 0 0 12px rgba(197,160,89,0.4);
  }

  .menu-item.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }

  .menu-icon {
    font-size: 16px;
    opacity: 0.7;
    min-width: 20px;
    transition: transform 0.25s ease;
  }

  .menu-item:hover .menu-icon {
    transform: translateX(4px);
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
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", animation: "crestPulse 4s ease-in-out infinite", pointerEvents: "none" }}>
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

// ── Animated corner ornament ─────────────────────────────────
function Corner({ pos }) {
    const style = {
        position: "absolute",
        width: 40, height: 40,
        ...pos,
        pointerEvents: "none",
    };
    const borders = {
        topLeft: { borderTop: "1px solid rgba(197,160,89,0.5)", borderLeft: "1px solid rgba(197,160,89,0.5)", top: 0, left: 0 },
        topRight: { borderTop: "1px solid rgba(197,160,89,0.5)", borderRight: "1px solid rgba(197,160,89,0.5)", top: 0, right: 0 },
        bottomLeft: { borderBottom: "1px solid rgba(197,160,89,0.5)", borderLeft: "1px solid rgba(197,160,89,0.5)", bottom: 0, left: 0 },
        bottomRight: { borderBottom: "1px solid rgba(197,160,89,0.5)", borderRight: "1px solid rgba(197,160,89,0.5)", bottom: 0, right: 0 },
    };
    return <div style={{ ...style, ...borders[Object.keys(pos)[0]] }} />;
}

// ── New Game sub-panel ───────────────────────────────────────
function NewGamePanel({ onStart, onBack }) {
    const [step, setStep] = useState("mode"); // "mode" | "difficulty"
    const [mode, setMode] = useState(null);
    const [diff, setDiff] = useState("SOLDIER");

    const handleModeSelect = (m) => {
        setMode(m);
        if (m === "pvp") {
            onStart({ mode: "pvp", diff: null });
        } else {
            setStep("difficulty");
        }
    };

    return (
        <div className="sub-panel" style={{ width: "100%" }}>
            {step === "mode" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.4)", fontSize: "11px", letterSpacing: "4px", marginBottom: "20px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center" }}>
                        SELECT MODE
                    </div>
                    <button className="menu-item" onClick={() => handleModeSelect("pvp")}>
                        <span className="menu-icon">⚔</span>
                        PLAYER VS PLAYER
                    </button>
                    <button className="menu-item" onClick={() => handleModeSelect("ai")}>
                        <span className="menu-icon">🤖</span>
                        PLAYER VS AI
                    </button>
                    <div style={{ height: "1px", background: "rgba(197,160,89,0.1)", margin: "12px 0" }} />
                    <button className="menu-item" onClick={onBack} style={{ fontSize: "12px", opacity: 0.5 }}>
                        <span className="menu-icon">←</span>
                        BACK
                    </button>
                </>
            )}

            {step === "difficulty" && (
                <>
                    <div style={{ color: "rgba(197,160,89,0.4)", fontSize: "11px", letterSpacing: "4px", marginBottom: "20px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center" }}>
                        CHOOSE DIFFICULTY
                    </div>

                    {[
                        { key: "RECRUIT", icon: "🌿", desc: "Casual — for learning", col: "#00ffff" },
                        { key: "SOLDIER", icon: "⚔", desc: "Balanced — fair challenge", col: "#c5a059" },
                        { key: "COMMANDER", icon: "💀", desc: "Brutal — may take 3–8s/move", col: "#ff0044" },
                    ].map(({ key, icon, desc, col }) => (
                        <button
                            key={key}
                            onClick={() => setDiff(key)}
                            style={{
                                width: "100%",
                                background: diff === key ? `${col}14` : "transparent",
                                border: `1px solid ${diff === key ? col : "rgba(197,160,89,0.15)"}`,
                                color: diff === key ? col : "rgba(197,160,89,0.5)",
                                padding: "12px 20px",
                                marginBottom: "8px",
                                cursor: "pointer",
                                fontFamily: "'Cinzel', serif",
                                letterSpacing: "2px",
                                fontSize: "13px",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                transition: "all 0.2s",
                                boxShadow: diff === key ? `0 0 12px ${col}22` : "none",
                            }}
                        >
                            <span style={{ fontSize: "18px" }}>{icon}</span>
                            <div>
                                <div style={{ fontWeight: 600 }}>{key}</div>
                                <div style={{ fontSize: "10px", opacity: 0.6, letterSpacing: "1px", marginTop: "2px" }}>{desc}</div>
                            </div>
                            {diff === key && <span style={{ marginLeft: "auto", fontSize: "10px" }}>✦ SELECTED</span>}
                        </button>
                    ))}

                    <div style={{ height: "1px", background: "rgba(197,160,89,0.1)", margin: "12px 0" }} />

                    <button
                        onClick={() => onStart({ mode: "ai", diff })}
                        style={{
                            width: "100%",
                            background: "rgba(197,160,89,0.1)",
                            border: "1px solid rgba(197,160,89,0.5)",
                            color: "#c5a059",
                            padding: "14px",
                            cursor: "pointer",
                            fontFamily: "'Cinzel', serif",
                            fontSize: "14px",
                            letterSpacing: "4px",
                            fontWeight: 700,
                            marginBottom: "8px",
                            transition: "all 0.2s",
                            textShadow: "0 0 10px rgba(197,160,89,0.4)",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(197,160,89,0.2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(197,160,89,0.1)"}
                    >
                        ⚔ BEGIN BATTLE
                    </button>

                    <button className="menu-item" onClick={() => setStep("mode")} style={{ fontSize: "12px", opacity: 0.5 }}>
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
            <div style={{ color: "rgba(197,160,89,0.4)", fontSize: "11px", letterSpacing: "4px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif" }}>CREDITS</div>
            <div style={{ color: "rgba(197,160,89,0.7)", fontSize: "13px", lineHeight: 2.2, letterSpacing: "2px", fontFamily: "'Cinzel', serif" }}>
                <div style={{ color: "#c5a059", fontSize: "15px", marginBottom: "4px" }}>SOFTCURSE LAB</div>
                <div style={{ opacity: 0.5, fontSize: "11px", marginBottom: "20px" }}>SOLE DEVELOPER & DESIGNER</div>
                <div style={{ opacity: 0.4, fontSize: "11px", letterSpacing: "1px" }}>3D Models — Creality Cloud Community</div>
                <div style={{ opacity: 0.4, fontSize: "11px", letterSpacing: "1px" }}>Textures — AmbientCG (CC0)</div>
                <div style={{ opacity: 0.4, fontSize: "11px", letterSpacing: "1px" }}>Engine — Three.js + React</div>
            </div>
            <div style={{ height: "1px", background: "rgba(197,160,89,0.1)", margin: "20px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "12px", opacity: 0.5, justifyContent: "center" }}>
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
            <div style={{ color: "rgba(197,160,89,0.4)", fontSize: "11px", letterSpacing: "4px", marginBottom: "20px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center" }}>HOW TO PLAY</div>
            {tips.map(([key, val]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid rgba(197,160,89,0.07)", fontFamily: "'Cinzel', serif" }}>
                    <span style={{ color: "#c5a059", fontSize: "11px", letterSpacing: "2px" }}>{key}</span>
                    <span style={{ color: "rgba(197,160,89,0.4)", fontSize: "11px" }}>{val}</span>
                </div>
            ))}
            <div style={{ height: "1px", background: "rgba(197,160,89,0.1)", margin: "12px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "12px", opacity: 0.5 }}>
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
            <div style={{ color: "rgba(197,160,89,0.4)", fontSize: "11px", letterSpacing: "4px", marginBottom: "20px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center" }}>SETTINGS</div>

            <div style={{ marginBottom: "15px" }}>
                <div style={{ color: "#c5a059", fontSize: "11px", letterSpacing: "2px", marginBottom: "8px" }}>AUDIO</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ color: "rgba(197,160,89,0.7)", fontSize: "11px" }}>MASTER</span>
                    <input type="range" min="0" max="100" defaultValue="100" style={{ width: "100px", accentColor: "#c5a059" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ color: "rgba(197,160,89,0.7)", fontSize: "11px" }}>MUSIC</span>
                    <input type="range" min="0" max="100" defaultValue="80" style={{ width: "100px", accentColor: "#c5a059" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(197,160,89,0.7)", fontSize: "11px" }}>SFX</span>
                    <input type="range" min="0" max="100" defaultValue="100" style={{ width: "100px", accentColor: "#c5a059" }} />
                </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
                <div style={{ color: "#c5a059", fontSize: "11px", letterSpacing: "2px", marginBottom: "8px" }}>LANGUAGE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {["ENGLISH", "РУССКИЙ", "ქართული"].map((l, i) => (
                        <label key={l} style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(197,160,89,0.7)", fontSize: "11px", cursor: "pointer" }}>
                            <input type="radio" name="lang" defaultChecked={i === 0} style={{ accentColor: "#c5a059" }} />
                            {l}
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ height: "1px", background: "rgba(197,160,89,0.1)", margin: "12px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "12px", opacity: 0.5 }}>
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
            background: "radial-gradient(ellipse at center, rgba(5,1,10,0.65) 0%, rgba(5,1,10,0.88) 100%)",
            backdropFilter: "blur(2px)",
        }}>
            <div style={{
                position: "relative",
                width: 380,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: visible ? 1 : 0,
                transition: "opacity 0.6s ease",
            }}>
                {/* Decorative background crest */}
                <div style={{ position: "relative", width: 180, height: 180, marginBottom: -60 }}>
                    <Crest />
                </div>

                {/* Title block */}
                <div style={{ textAlign: "center", marginBottom: "42px", position: "relative", zIndex: 1 }}>
                    <div style={{
                        fontFamily: "'Cinzel Decorative', serif",
                        fontSize: "48px",
                        fontWeight: 900,
                        color: "#c5a059",
                        letterSpacing: "3px",
                        animation: "titleGlow 3s ease-in-out infinite",
                        lineHeight: 1.2,
                    }}>
                        SOFTCURSE'S
                    </div>
                    <div style={{
                        fontFamily: "'Cinzel Decorative', serif",
                        fontSize: "64px",
                        fontWeight: 900,
                        color: "#e0c88a",
                        letterSpacing: "2px",
                        animation: "titleGlow 3s ease-in-out infinite",
                        lineHeight: 1.1,
                    }}>
                        CHESS
                    </div>
                    <div style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: "14px",
                        color: "rgba(197,160,89,0.8)",
                        letterSpacing: "8px",
                        marginTop: "16px",
                        animation: "subtitlePulse 4s ease-in-out infinite",
                    }}>
                        ANGELS VS DEMONS
                    </div>

                    {/* Decorative line */}
                    <div style={{ position: "relative", height: "1px", margin: "16px 0", overflow: "hidden" }}>
                        <div style={{
                            position: "absolute", left: "50%", transform: "translateX(-50%)",
                            height: "1px", background: "linear-gradient(90deg, transparent, rgba(197,160,89,0.6), transparent)",
                            animation: visible ? "lineExpand 1s ease forwards" : "none",
                            width: "100%",
                        }} />
                    </div>
                </div>

                {/* Menu box */}
                <div style={{
                    position: "relative",
                    width: "100%",
                    padding: "8px 0",
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
                            {disabled && <span style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.4 }}>NO SAVE</span>}
                        </button>
                    ))}

                    {/* Sub panels */}
                    {panel === "newgame" && <NewGamePanel onStart={onStart} onBack={() => setPanel("main")} />}
                    {panel === "credits" && <CreditsPanel onBack={() => setPanel("main")} />}
                    {panel === "howtoplay" && <HowToPlayPanel onBack={() => setPanel("main")} />}
                    {panel === "settings" && <SettingsPanel onBack={() => setPanel("main")} />}
                </div>

                <div style={{
                    marginTop: "16px",
                    fontFamily: "'Cinzel', serif",
                    fontSize: "10px",
                    color: "rgba(197,160,89,0.2)",
                    letterSpacing: "3px",
                }}>
                    SOFTCURSE LAB © 2025
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
                        src="/intro/flash_screen.mp4"
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
                                <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", padding: "5px 12px", borderBottom: "1px solid rgba(197,160,89,.1)" }}>
                                    <span style={{ color: "rgba(197,160,89,.3)", fontSize: "11px" }}>#</span>
                                    <span style={{ color: "rgba(239,230,160,.9)", fontWeight: "bold", textShadow: "0 0 8px rgba(239,230,160,0.6)", fontSize: "11px" }}>⬜ WHITE</span>
                                    <span style={{ color: "rgba(95,5,5,1)", fontWeight: "bold", textShadow: "0 0 8px rgba(255,0,0,0.8)", fontSize: "11px" }}>⬛ BLACK</span>
                                </div>
                                <div ref={logRef} style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
                                    {moveLog.length === 0 && (
                                        <div style={{ color: "rgba(197,160,89,.2)", fontSize: "12px", textAlign: "center", padding: "16px" }}>no moves yet</div>
                                    )}
                                    {moveLog.map((pair, i) => (
                                        <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", padding: "4px 12px", background: i % 2 === 0 ? "transparent" : "rgba(197,160,89,.04)" }}>
                                            <span style={{ color: "rgba(197,160,89,.3)", fontSize: "13px" }}>{i + 1}.</span>
                                            <span style={{ color: "rgba(239,230,160,1)", fontSize: "13px", fontWeight: "bold", textShadow: "0 0 8px rgba(239,230,160,0.5)" }}>{pair.w || ""}</span>
                                            <span style={{ color: "rgba(95,5,5,1)", fontSize: "13px", fontWeight: "bold", textShadow: "0 0 8px rgba(255,0,0,0.6)" }}>{pair.b || ""}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Captured pieces */}
                    <div style={{ position: "absolute", bottom: 20, left: 20, pointerEvents: "none", animation: "hudSlideUp 0.5s ease forwards" }}>
                        <div style={{ color: "rgba(239,230,160,.9)", fontWeight: "bold", textShadow: "0 0 8px rgba(239,230,160,.7)", fontSize: "11px", letterSpacing: "2.5px", marginBottom: "5px", fontFamily: "'Cinzel Decorative', serif" }}>CAPTURED BY WHITE</div>
                        <div style={{ color: "#efe6a0", fontSize: "26px", lineHeight: 1, textShadow: "0 0 10px rgba(239,230,160,.8)", minHeight: "28px" }}>
                            {caps.w.map((t, i) => <span key={i} style={{ marginRight: "2px" }}>{SYM_W[t]}</span>)}
                        </div>
                    </div>
                    <div style={{ position: "absolute", bottom: 20, right: 20, textAlign: "right", pointerEvents: "none", animation: "hudSlideUp 0.5s ease forwards" }}>
                        <div style={{ color: "rgba(95,5,5,1)", fontWeight: "bold", textShadow: "0 0 10px rgba(255,0,0,.7)", fontSize: "11px", letterSpacing: "2.5px", marginBottom: "5px", fontFamily: "'Cinzel Decorative', serif" }}>CAPTURED BY BLACK</div>
                        <div style={{ color: "#5f0505", fontSize: "26px", lineHeight: 1, textShadow: "0 0 10px rgba(255,0,0,.8)", minHeight: "28px" }}>
                            {caps.b.map((t, i) => <span key={i} style={{ marginRight: "2px" }}>{SYM_B[t]}</span>)}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none" }}>
                        <div style={{ color: "rgba(197,160,89,.9)", fontWeight: "bold", textShadow: "0 0 8px rgba(197,160,89,.5)", fontSize: "11px", letterSpacing: "2.5px", fontFamily: "'Cinzel', serif" }}>
                            CLICK PIECE → SELECT &nbsp;·&nbsp; CLICK DOT → MOVE &nbsp;·&nbsp; RIGHT DRAG → ORBIT
                        </div>
                    </div>
                </>
            )}

            {/* ── Promotion Modal ───────────────────────────────── */}
            {promoModal && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(3px)" }}>
                    <div style={{ position: "relative", background: "rgba(5,1,10,.97)", border: "1px solid rgba(197,160,89,.4)", padding: "28px 32px", textAlign: "center", boxShadow: "0 0 40px rgba(197,160,89,.15)" }}>
                        <div style={{ color: "rgba(197,160,89,.55)", fontSize: "13px", letterSpacing: "4px", marginBottom: "6px", fontFamily: "'Cinzel Decorative', serif" }}>PROMOTION</div>
                        <div style={{ color: "#e0f0ff", fontSize: "18px", letterSpacing: "3px", marginBottom: "20px", fontFamily: "'Cinzel Decorative', serif" }}>CHOOSE YOUR PIECE</div>
                        {["topLeft", "topRight", "bottomLeft", "bottomRight"].map(k => (
                            <div key={k} style={{
                                position: "absolute", width: 12, height: 12,
                                ...(k === "topLeft" ? { top: 8, left: 8, borderTop: "1px solid rgba(197,160,89,.5)", borderLeft: "1px solid rgba(197,160,89,.5)" } : {}),
                                ...(k === "topRight" ? { top: 8, right: 8, borderTop: "1px solid rgba(197,160,89,.5)", borderRight: "1px solid rgba(197,160,89,.5)" } : {}),
                                ...(k === "bottomLeft" ? { bottom: 8, left: 8, borderBottom: "1px solid rgba(197,160,89,.5)", borderLeft: "1px solid rgba(197,160,89,.5)" } : {}),
                                ...(k === "bottomRight" ? { bottom: 8, right: 8, borderBottom: "1px solid rgba(197,160,89,.5)", borderRight: "1px solid rgba(197,160,89,.5)" } : {}),
                            }} />
                        ))}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                            {PROMO_OPTS.map(({ t, sym, label }) => {
                                const isW = promoModal.color === W;
                                const col = isW ? "#efe6a0" : "#5f0505";
                                const shadow = isW ? "rgba(239,230,160,.3)" : "rgba(95,5,5,.3)";
                                return (
                                    <button key={t} onClick={() => promoModal.resolve(t)}
                                        style={{ background: "transparent", border: `1px solid ${col}44`, color: col, padding: "14px 16px", cursor: "pointer", fontFamily: "'Cinzel', serif", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "all .18s", minWidth: 64 }}
                                        onMouseEnter={e => { e.currentTarget.style.background = `${col}14`; e.currentTarget.style.borderColor = col; e.currentTarget.style.boxShadow = `0 0 14px ${shadow}`; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${col}44`; e.currentTarget.style.boxShadow = "none"; }}>
                                        <span style={{ fontSize: "34px", lineHeight: 1, textShadow: `0 0 8px ${shadow}` }}>{sym[isW ? 0 : 1]}</span>
                                        <span style={{ fontSize: "11px", letterSpacing: "2px", opacity: 0.6 }}>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* CRT scanline overlay */}
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.03) 2px,rgba(0,0,0,.03) 4px)", pointerEvents: "none", opacity: 0.4 }} />
        </div>
    );
}