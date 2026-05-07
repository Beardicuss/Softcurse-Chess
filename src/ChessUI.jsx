import { useState, useEffect, useRef } from "react";
import { W, B } from "./chessEngine.js";
import { SYM_W, SYM_B, ASSET_CDN } from "./constants.js";
import { useLang, langCodes } from "./i18n.js";
import SplashScreen from "./SplashScreen.jsx";

// ═══════════════════════════════════════════════════════════════
//  CHESS UI — Main Menu + HUD overlay
// ═══════════════════════════════════════════════════════════════

const PROMO_OPTS = [
    { t: "Q", sym: ["♕", "♛"], label: "QUEEN" },
    { t: "R", sym: ["♖", "♜"], label: "ROOK" },
    { t: "B", sym: ["♗", "♝"], label: "BISHOP" },
    { t: "N", sym: ["♘", "♞"], label: "KNIGHT" },
];

import "./ui/ChessUI.css";
import Crest from "./ui/Crest.jsx";
import CreditsPanel from "./ui/CreditsPanel.jsx";
import TreasuryPanel from "./ui/TreasuryPanel.jsx";
import SettingsPanel from "./ui/SettingsPanel.jsx";
import NewGamePanel from "./ui/NewGamePanel.jsx";







// ── Main Menu overlay ────────────────────────────────────────
function MainMenu({ onStart, hasSave, allPhasesReady }) {
    const { t } = useLang();
    const [panel, setPanel] = useState("main"); // "main" | "newgame" | "credits" | "treasury"
    const [visible, setVisible] = useState(false);
    const touchStartX = useRef(null);

    useEffect(() => {
        const tObj = setTimeout(() => setVisible(true), 200);
        return () => clearTimeout(tObj);
    }, []);

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (diff > 50 && panel !== "main") {
            setPanel("main");
        }
        touchStartX.current = null;
    };

    const MENU_ITEMS = [
        { label: t.NEW_GAME, icon: "⚔", panel: "newgame", delay: 0 },
        { label: t.CONTINUE, icon: "▶", panel: "continue", delay: 80, disabled: !hasSave },
        { label: t.TREASURY, icon: "💎", panel: "treasury", delay: 160 },
        { label: t.SETTINGS, icon: "⚙", panel: "settings", delay: 240 },
        { label: t.CREDITS, icon: "✦", panel: "credits", delay: 320 },
        { label: t.EXIT, icon: "⏏", panel: "exit", delay: 400 },
    ];

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                overflowY: "auto", overflowX: "hidden",
                zIndex: 50,
                background: "radial-gradient(ellipse at center, rgba(5,1,10,0.7) 0%, rgba(5,1,10,0.92) 100%)",
                backdropFilter: "blur(3px)",
            }}
        >
            <div style={{
                position: "relative",
                width: "min(440px, 90vw)",
                margin: "auto",
                padding: "clamp(20px, 5vh, 60px) 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: visible ? 1 : 0,
                transition: "opacity 0.6s ease",
            }}>
                {/* Decorative background crest */}
                <div style={{ position: "relative", width: "min(220px, 50vw)", height: "min(220px, 50vw)", marginBottom: "clamp(-80px, -15vw, -40px)" }}>
                    <Crest />
                </div>

                {/* Title block */}
                <div style={{ textAlign: "center", marginBottom: "50px", position: "relative", zIndex: 1 }}>
                    <div style={{
                        fontFamily: "'Cinzel Decorative', serif",
                        fontSize: "clamp(32px, 9vw, 72px)",
                        fontWeight: 900,
                        color: "#c5a059",
                        letterSpacing: "clamp(3px, 1vw, 8px)",
                        animation: "titleGlow 3s ease-in-out infinite",
                        lineHeight: 1.1,
                    }}>
                        SOFTCURSE'S
                    </div>
                    <div style={{
                        fontFamily: "'Cinzel Decorative', serif",
                        fontSize: "clamp(40px, 12vw, 96px)",
                        fontWeight: 900,
                        color: "#e0c88a",
                        letterSpacing: "clamp(2px, 1vw, 6px)",
                        animation: "titleGlow 3s ease-in-out infinite",
                        lineHeight: 1.0,
                    }}>
                        CHESS
                    </div>
                    <div style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: "clamp(12px, 3vw, 22px)",
                        color: "rgba(197,160,89,0.85)",
                        letterSpacing: "clamp(4px, 1.5vw, 12px)",
                        marginTop: "clamp(12px, 3vw, 24px)",
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
                                else if (p === "exit") { forceExit(); }
                                else setPanel(p);
                            }}
                        >
                            <span className="menu-icon">{icon}</span>
                            {label}
                            {disabled && <span style={{ marginLeft: "auto", fontSize: "12px", opacity: 0.4 }}>NO SAVE</span>}
                        </button>
                    ))}

                    {/* Sub panels */}
                    {panel === "newgame" && <NewGamePanel onStart={onStart} onBack={() => setPanel("main")} allPhasesReady={allPhasesReady} />}
                    {panel === "credits" && <CreditsPanel onBack={() => setPanel("main")} />}
                    {panel === "treasury" && <TreasuryPanel onBack={() => setPanel("main")} />}
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
export default function ChessUI({
    mountRef, msg, caps, moveCount, mode, diff, thinking, promoModal,
    moveLog, logOpen, logRef,
    setModeFixed, setDiffFixed, setLogOpen,
    gameStarted, onMenuStart,
    phase1Ready, allPhasesReady, phase1Progress,
    eloStats, onlineRematchState, onlineRematchTime
}) {
    const { t } = useLang();

    const LOADING_MSGS = [t.LOADING_1, t.LOADING_2, t.LOADING_3];
    const [loadMsgIdx, setLoadMsgIdx] = useState(0);
    const isWt = msg.includes("_W") || msg.includes("WHITE");
    const isDraw = msg.includes("STALEMATE") || msg.includes("DRAW");
    const mc = msg.includes("MATE") || msg.includes("WINS") ? "#c5a059"
        : isDraw ? "#88aaaa"
            : msg.includes("CHECK") ? "#ff4444"
                : isWt ? "#efe6a0" : "#ff7777";

    const hasSave = !!localStorage.getItem("battleChessSave");
    const isGameOver = msg === "MATE_W" || msg === "MATE_B" || msg === "STALEMATE";
    const isMobile = typeof window !== 'undefined' && (/Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth <= 768);
    const [paused, setPaused] = useState(false);
    const [pausePanel, setPausePanel] = useState("main");

    useEffect(() => {
        if (!paused) setPausePanel("main");
    }, [paused]);

    // Intro state machine: "splash" → "loading" → "done"
    const [introState, setIntroState] = useState("splash");
    const videoRef = useRef(null);

    // Cycle loading messages while on loading screen
    useEffect(() => {
        if (introState !== "loading" || phase1Ready) return;
        const iv = setInterval(() => setLoadMsgIdx(i => (i + 1) % LOADING_MSGS.length), 2500);
        return () => clearInterval(iv);
    }, [introState, phase1Ready]);

    // Skip handler — only allow skip after 1s, and guard against double-fire
    useEffect(() => {
        if (introState !== "splash") return;
        let skipped = false;
        const onSkip = () => {
            if (skipped) return;
            skipped = true;
            setIntroState("loading");
        };
        // Delay adding listeners so page load click doesn't accidentally skip
        const t = setTimeout(() => {
            window.addEventListener("keydown", onSkip);
            window.addEventListener("mousedown", onSkip);
        }, 1000);
        return () => {
            clearTimeout(t);
            window.removeEventListener("keydown", onSkip);
            window.removeEventListener("mousedown", onSkip);
        };
    }, [introState]);

    const handleTapToContinue = () => {
        // Once the user agrees to continue past the Loading Screen, we're securely ready to enter the application
        setIntroState("done");
    };

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
            width: "100%", height: "100dvh",
            background: "#05010a",
            fontFamily: "'Cinzel', serif",
            position: "relative", overflow: "hidden",
            userSelect: "none",
        }}>


            {/* Three.js canvas mount — hidden until intro is complete */}
            <div ref={mountRef} style={{ width: "100%", height: "100%", visibility: introState === "done" ? "visible" : "hidden" }} />

            {/* ── LOADING SCREEN (poster + progress / tap to continue) ── */}
            {introState === "loading" && (
                <div
                    style={{
                        position: "absolute", inset: 0, zIndex: 9999,
                        background: "#0a0604",
                        backgroundImage: "url('/assets/poster.png')",
                        backgroundSize: "cover", backgroundPosition: "center top",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "flex-end",
                        paddingBottom: "15vh", cursor: phase1Ready ? "pointer" : "default",
                    }}
                    onClick={phase1Ready ? handleTapToContinue : undefined}
                >
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
                    <div style={{
                        position: "relative", zIndex: 1, width: "70%", maxWidth: 500,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
                    }}>
                        {!phase1Ready ? (
                            <>
                                <div style={{
                                    color: "#c5a059", fontSize: "clamp(12px, 3vw, 16px)", letterSpacing: "clamp(3px, 1vw, 6px)",
                                    fontFamily: "'Cinzel', serif",
                                    animation: "loadingPulse 2.5s ease-in-out infinite",
                                    textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                                }}>
                                    {LOADING_MSGS[loadMsgIdx]}
                                </div>
                                <div style={{
                                    width: "100%", height: 4, borderRadius: 2, position: "relative",
                                    background: "rgba(0,0,0,0.6)", overflow: "hidden",
                                    boxShadow: "0 2px 10px rgba(0,0,0,1)",
                                }}>
                                    <div style={{
                                        position: "absolute", left: 0, top: 0, bottom: 0, width: "100%",
                                        background: "linear-gradient(90deg, #e0c88a 0%, #c5a059 50%, #3a3a3a 50%, #111111 100%)",
                                        clipPath: `inset(0 ${100 - (phase1Progress * 100).toFixed(0)}% 0 0)`,
                                        transition: "clip-path 0.4s ease",
                                    }} />
                                </div>
                            </>
                        ) : (
                            <div style={{
                                color: "#c5a059", fontSize: "clamp(14px, 3.5vw, 18px)", letterSpacing: "clamp(4px, 1.5vw, 8px)",
                                fontFamily: "'Cinzel', serif", textAlign: "center",
                                animation: "loadingPulse 1.5s ease-in-out infinite",
                                cursor: "pointer",
                            }}>
                                {t.TAP_CONTINUE}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── NATIVE CANVAS SPLASH SCREEN (Runs FIRST) ──────── */}
            {introState === "splash" && (
                <SplashScreen
                    logoSrc="/intro/logo.png"
                    onComplete={() => setIntroState("loading")}
                />
            )}

            {/* ── MAIN MENU ─────────────────────────────────────── */}
            {introState === "done" && !gameStarted && (
                <MainMenu
                    hasSave={hasSave}
                    onStart={(cfg) => onMenuStart(cfg)}
                    allPhasesReady={allPhasesReady}
                />
            )}

            {/* ── HUD (only when game started) ──────────────────── */}
            {gameStarted && (
                <>
                    {paused && (
                        <div style={{
                            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                            background: "rgba(5,1,10,0.85)", backdropFilter: "blur(4px)",
                            display: "flex", flexDirection: "column",
                            overflowY: "auto", overflowX: "hidden",
                            zIndex: 100,
                        }}>
                            <div style={{ margin: "auto", padding: "clamp(20px, 5vh, 60px) 0", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                                {pausePanel === "main" ? (
                                    <>
                                        <div style={{ color: "#c5a059", fontSize: "clamp(22px, 5vw, 32px)", letterSpacing: "clamp(4px, 1vw, 8px)", fontFamily: "'Cinzel Decorative', serif", marginBottom: "clamp(20px, 5vw, 40px)", textShadow: "0 0 20px rgba(197,160,89,0.5)", textAlign: "center" }}>{t.PAUSED}</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 15, width: "min(260px, 80vw)" }}>
                                            <button className="menu-item" onClick={() => setPaused(false)}>▶ {t.RESUME}</button>
                                            {mode !== "online" && (
                                                <button className="menu-item" onClick={() => { window._battleChessAbandonMatch?.(); window._battleChessReset?.(); setPaused(false); }}>⟳ RESTART</button>
                                            )}
                                            <button className="menu-item" onClick={() => setPausePanel("settings")}>⚙ {t.SETTINGS}</button>
                                            <button className="menu-item" onClick={() => { window._battleChessAbandonMatch?.(); window._battleChessExitToMenu?.(); setPaused(false); }}>⧉ {t.MAIN_MENU}</button>
                                            <button className="menu-item" onClick={() => { window._battleChessAbandonMatch?.(); forceExit(); }}>⏏ {t.EXIT}</button>
                                        </div>
                                    </>
                                ) : (
                                    <SettingsPanel onBack={() => setPausePanel("main")} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* ☰ Hamburger MENU (visible when not paused, mobile only) */}
                    {!paused && isMobile && (
                        <div style={{
                            position: "absolute", top: "clamp(6px, 1.5vw, 12px)", left: "clamp(6px, 1.5vw, 12px)",
                            display: "flex", gap: "8px", zIndex: 90, pointerEvents: "auto",
                        }}>
                            <button
                                onClick={() => setPaused(true)}
                                style={{
                                    background: "rgba(5,1,10,0.7)", border: "1px solid rgba(197,160,89,0.3)",
                                    color: "#c5a059", fontSize: "20px", padding: "6px 10px",
                                    cursor: "pointer", fontFamily: "'Cinzel', serif",
                                    backdropFilter: "blur(4px)", borderRadius: "4px",
                                }}
                            >☰</button>
                        </div>
                    )}

                    {/* Top Right Buttons (Fullscreen) */}
                    {!paused && (
                        <div style={{
                            position: "absolute", top: "clamp(6px, 1.5vw, 12px)", right: "clamp(6px, 1.5vw, 12px)",
                            display: "flex", gap: "8px", zIndex: 90, pointerEvents: "auto",
                        }}>
                            {/* Fullscreen & Orientation Lock Button */}
                            <button
                                onClick={async () => {
                                    try {
                                        const d = document.documentElement;
                                        if (!document.fullscreenElement) {
                                            await (d.requestFullscreen || d.webkitRequestFullscreen)?.call(d);
                                            await screen.orientation?.lock?.('landscape').catch(() => { });
                                        } else {
                                            (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
                                            screen.orientation?.unlock?.();
                                        }
                                    } catch (e) {
                                        console.warn("Fullscreen API or Orientation lock failed:", e);
                                    }
                                }}
                                style={{
                                    background: "rgba(5,1,10,0.7)", border: "1px solid rgba(197,160,89,0.3)",
                                    color: "#c5a059", fontSize: "16px", padding: "6px 12px",
                                    cursor: "pointer", fontFamily: "'Cinzel', serif",
                                    backdropFilter: "blur(4px)", borderRadius: "4px", display: "flex", alignItems: "center"
                                }}
                            >⛶ FS</button>
                        </div>
                    )}

                    {/* Top bar */}
                    <div style={{
                        position: "absolute", top: 0, left: 0, right: 0,
                        padding: "clamp(8px, 2vw, 14px)",
                        pointerEvents: "none",
                        display: "flex", justifyContent: "center", alignItems: "center",
                        background: "linear-gradient(180deg,rgba(5,1,10,.93) 0%,transparent 100%)",
                        animation: "hudSlideDown 0.5s ease forwards",
                    }}>
                        {/* Left — title */}
                        <div style={{ position: "absolute", left: "clamp(10px, 2vw, 20px)", display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: 2, height: 32, background: "#c5a059", boxShadow: "0 0 8px #c5a059", display: window.innerWidth <= 768 ? "none" : "block" }} />
                            <div style={{ display: window.innerWidth <= 768 ? "none" : "block" }}>
                                <div style={{ color: "#c5a059", fontSize: "clamp(10px, 2vw, 13px)", letterSpacing: "clamp(2px, 0.8vw, 5px)", opacity: 0.75, fontFamily: "'Cinzel Decorative', serif", textTransform: "uppercase" }}>Softcurse's Chess</div>
                                <div style={{ color: "#e0f0ff", fontSize: "clamp(14px, 3vw, 20px)", letterSpacing: "clamp(1px, 0.5vw, 3px)", fontWeight: "bold", textShadow: "0 0 10px rgba(197,160,89,.6)", fontFamily: "'Cinzel Decorative', serif", textTransform: "uppercase" }}>{t.AVD}</div>
                            </div>
                        </div>

                        {/* Center — status */}
                        <div style={{
                            padding: "clamp(6px, 1.5vw, 10px) clamp(12px, 3vw, 26px)",
                            border: `1px solid ${thinking ? "#224422" : mc + "44"}`,
                            background: thinking ? "rgba(0,40,20,.4)" : `${mc}11`,
                            color: thinking ? "#00ff88" : mc,
                            fontWeight: "bold",
                            fontSize: "clamp(11px, 2vw, 16px)", letterSpacing: "2px",
                            textShadow: thinking ? "0 0 8px #00ff88" : `0 0 12px ${mc === "#5f0505" ? "#ff0000" : mc}`,
                            textAlign: "center",
                            transition: "all .3s",
                            fontFamily: "'Cinzel', serif",
                        }}>
                            {thinking ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ display: "inline-block", width: 9, height: 9, border: "1px solid #00ff88", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .75s linear infinite" }} />
                                    {t.COMPUTING || "AI COMPUTING…"}
                                </span>
                            ) : (t[msg] || msg)}
                        </div>

                        {/* Right HUD controls have been removed from the top bar per request */}
                    </div>

                    {/* Move Log Panel */}
                    <div style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", display: "flex", alignItems: "center", zIndex: 10 }}>
                        <button onClick={() => setLogOpen(o => !o)} style={{ background: "rgba(5,1,10,.88)", border: "1px solid rgba(197,160,89,.3)", borderLeft: "none", color: "#c5a059", padding: "16px 6px", fontSize: "11px", letterSpacing: "3px", cursor: "pointer", fontFamily: "'Cinzel Decorative', serif", writingMode: "vertical-rl", textOrientation: "mixed", lineHeight: 1 }}>
                            {logOpen ? "◀ LOG" : "▶ LOG"}
                        </button>
                        {logOpen && (
                            <div style={{ background: "rgba(5,1,10,.95)", border: "1px solid rgba(197,160,89,.25)", borderLeft: "none", width: "min(230px, 60vw)", maxHeight: "min(400px, 50vh)", display: "flex", flexDirection: "column" }}>
                                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(197,160,89,.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: "rgba(197,160,89,.6)", fontSize: "12px", letterSpacing: "2.5px", fontFamily: "'Cinzel Decorative', serif" }}>{t.MOVE_LOG}</span>
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
                    <div style={{ position: "absolute", bottom: "clamp(10px, 2vw, 20px)", left: "clamp(10px, 2vw, 20px)", display: "flex", flexDirection: "column", gap: 10, animation: "hudSlideUp 0.5s ease forwards", pointerEvents: "none" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: "min(200px, 40vw)" }}>
                            {caps.w.map((t, i) => <span key={i} style={{ color: "#c5a059", fontSize: "clamp(14px, 3vw, 20px)", textShadow: "0 0 8px rgba(197,160,89,.4)" }}>{SYM_W[t]}</span>)}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: "min(200px, 40vw)" }}>
                            {caps.b.map((t, i) => <span key={i} style={{ color: "#7a3232", fontSize: "clamp(14px, 3vw, 20px)", textShadow: "0 0 8px rgba(122,50,50,.4)" }}>{SYM_B[t]}</span>)}
                        </div>
                    </div>

                    {/* Bottom Right HUD (Moves, Elo, Rematch) */}
                    {!paused && (
                        <div style={{
                            position: "absolute", bottom: "clamp(10px, 2vw, 20px)", right: "clamp(10px, 2vw, 20px)",
                            display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px",
                            zIndex: 90, pointerEvents: "auto", animation: "hudSlideUp 0.5s ease forwards"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(5,1,10,0.7)", padding: "4px 8px", borderRadius: "4px", border: "1px solid rgba(197,160,89,0.3)" }}>
                                <div style={{ color: "rgba(197,160,89,.8)", fontSize: "13px", letterSpacing: "2px", fontFamily: "'Cinzel Decorative', serif" }}>{t.MOVE} {moveCount}</div>
                                {mode === "ai" && eloStats && (
                                    <div style={{
                                        color: "#c5a059", fontSize: "12px", letterSpacing: "1px",
                                        fontFamily: "'Cinzel', serif", padding: "2px 8px",
                                        border: "1px solid rgba(197,160,89,0.3)",
                                        background: "rgba(197,160,89,0.08)",
                                    }}>⚔ {eloStats.elo}</div>
                                )}
                            </div>
                            {isGameOver && (
                                <button className="hud-btn" style={{ borderColor: "rgba(100,200,100,.6)", color: "#66cc66" }} onClick={() => window._battleChessRematch?.()}>
                                    {mode === "online"
                                        ? (onlineRematchState === "requested_by_me" ? `WAITING... (${onlineRematchTime}s)`
                                            : onlineRematchState === "requested_by_op" ? `ACCEPT REMATCH (${onlineRematchTime}s)`
                                                : `⟳ REMATCH (${onlineRematchTime}s)`)
                                        : "⟳ REMATCH"}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Promotion modal */}
                    {promoModal && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(5,1,10,.8)", display: "flex", flexDirection: "column", overflowY: "auto", zIndex: 200 }}>
                            <div style={{ margin: "auto", padding: "20px", display: "flex", justifyContent: "center" }}>
                                <div style={{ background: "rgba(5,1,10,.95)", border: "1px solid #c5a059", padding: "clamp(20px, 4vw, 30px)", textAlign: "center", maxWidth: "95vw" }}>
                                    <div style={{ color: "#c5a059", fontSize: "clamp(14px, 3vw, 18px)", letterSpacing: "4px", marginBottom: 25, fontFamily: "'Cinzel Decorative', serif" }}>{t.PAWN_PROMO}</div>
                                    <div style={{ display: "flex", gap: "clamp(8px, 1.5vw, 15px)", flexWrap: "wrap", justifyContent: "center" }}>
                                        {PROMO_OPTS.map(o => (
                                            <button key={o.t} onClick={() => window._battleChessPromoChoice?.(o.t)} style={{ background: "rgba(197,160,89,.1)", border: "1px solid rgba(197,160,89,.3)", color: "#c5a059", padding: "clamp(10px, 2vw, 15px) clamp(12px, 3vw, 20px)", cursor: "pointer", transition: "all .2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(197,160,89,.25)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(197,160,89,.1)"}>
                                                <div style={{ fontSize: "clamp(24px, 5vw, 32px)", marginBottom: 5 }}>{o.sym[promoModal.color === W ? 0 : 1]}</div>
                                                <div style={{ fontSize: "clamp(8px, 1.5vw, 10px)", letterSpacing: 2 }}>{o.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )
            }
        </div >
    );
}