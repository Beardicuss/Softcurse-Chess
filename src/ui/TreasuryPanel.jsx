import { useState } from "react";
import { useLang } from "../i18n.js";
import { PIECE_SKINS, BOARD_SKINS, SCENE_SKINS, getActiveSkinId, setActiveSkinId } from "../skinRegistry.js";

const TABS = ["PIECES", "BOARD", "SCENE"];

export default function TreasuryPanel({ onBack }) {
    const { t } = useLang();
    const [tab, setTab] = useState("PIECES");
    const [activeSkin, setActiveSkin] = useState(getActiveSkinId);

    const handleSelect = (id) => {
        setActiveSkinId(id);
        setActiveSkin(id);
        // Trigger live piece reload if in-game
        window._battleChessReloadPieces?.();
    };

    return (
        <div className="sub-panel" style={{ width: "100%", maxWidth: "500px", margin: "0", textAlign: "left", paddingRight: "10px" }}>
            {/* Title */}
            <div style={{
                color: "#c8cdd4", fontSize: "clamp(28px, 6vw, 42px)", letterSpacing: "4px",
                marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif",
                fontWeight: 700, textShadow: "0 0 20px rgba(140,160,190,0.2)"
            }}>
                {t.TREASURY || "TREASURY"}
            </div>

            {/* Tabs */}
            <div style={{
                display: "flex", gap: "20px", marginBottom: "24px",
                borderBottom: "1px solid rgba(200,210,220,0.1)", paddingBottom: "12px",
            }}>
                {TABS.map((tb) => (
                    <button
                        key={tb}
                        onClick={() => setTab(tb)}
                        style={{
                            background: "transparent",
                            color: tab === tb ? "#c5a059" : "rgba(200,210,220,0.5)",
                            border: "none",
                            fontFamily: "'Cinzel', serif", fontSize: "14px",
                            letterSpacing: "3px", fontWeight: 700, cursor: "pointer",
                            transition: "all 0.2s",
                            padding: "4px 8px",
                            borderBottom: tab === tb ? "2px solid #c5a059" : "2px solid transparent",
                        }}
                        onMouseEnter={e => {
                            if (tab !== tb) e.currentTarget.style.color = "rgba(200,210,220,0.8)";
                        }}
                        onMouseLeave={e => {
                            if (tab !== tb) e.currentTarget.style.color = "rgba(200,210,220,0.5)";
                        }}
                    >
                        {t[tb] || tb}
                    </button>
                ))}
            </div>

            {/* PIECES Tab */}
            {tab === "PIECES" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "50vh", overflowY: "auto", paddingRight: "8px" }}>
                    {PIECE_SKINS.map((skin) => {
                        const isActive = activeSkin === skin.id;
                        return (
                            <div
                                key={skin.id}
                                onClick={() => handleSelect(skin.id)}
                                style={{
                                    width: "100%",
                                    background: isActive ? "linear-gradient(90deg, rgba(197,160,89,0.15), transparent)" : "transparent",
                                    borderLeft: `3px solid ${isActive ? "#c5a059" : "transparent"}`,
                                    padding: "16px 20px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.3s ease",
                                    position: "relative",
                                    overflow: "hidden",
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) e.currentTarget.style.background = "rgba(200,210,220,0.03)";
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) e.currentTarget.style.background = "transparent";
                                }}
                            >
                                {/* Equipped badge */}
                                {isActive && (
                                    <div style={{
                                        position: "absolute", top: "12px", right: "16px",
                                        color: "#c5a059", fontSize: "10px", letterSpacing: "2px",
                                        fontFamily: "'Cinzel', serif", fontWeight: 700,
                                        opacity: 0.8,
                                    }}>
                                        ✦ EQUIPPED
                                    </div>
                                )}

                                {/* Icon + Name */}
                                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "28px", width: "32px", textAlign: "center", opacity: isActive ? 1 : 0.6 }}>{skin.icon}</span>
                                    <span style={{
                                        fontFamily: "'Cinzel Decorative', serif",
                                        fontSize: "16px", fontWeight: 700,
                                        color: isActive ? "#e0c88a" : "rgba(200,210,220,0.7)",
                                        letterSpacing: "2px",
                                    }}>
                                        {skin.name}
                                    </span>
                                </div>

                                {/* Description */}
                                <div style={{
                                    fontFamily: "sans-serif", fontSize: "12px",
                                    color: isActive ? "rgba(200,210,220,0.8)" : "rgba(200,210,220,0.4)",
                                    letterSpacing: "1px", paddingLeft: "46px",
                                }}>
                                    {skin.description}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* BOARD Tab — Coming Soon */}
            {tab === "BOARD" && (
                <ComingSoon items={BOARD_SKINS} label={t.BOARD || "BOARD"} />
            )}

            {/* SCENE Tab — Coming Soon */}
            {tab === "SCENE" && (
                <ComingSoon items={SCENE_SKINS} label={t.SCENE || "SCENE"} />
            )}

            {/* Back button */}
            <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.15), transparent)", margin: "24px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "15px", opacity: 0.6 }}>
                <span className="menu-icon">←</span>
                {t.BACK}
            </button>
        </div>
    );
}

function ComingSoon({ items, label }) {
    return (
        <div style={{
            textAlign: "left", padding: "40px 20px",
            borderLeft: "3px solid rgba(200,210,220,0.1)",
            background: "linear-gradient(90deg, rgba(200,210,220,0.02), transparent)",
        }}>
            <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>🔒</div>
            <div style={{
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: "16px", color: "rgba(200,210,220,0.5)",
                letterSpacing: "4px", fontWeight: 700, marginBottom: "8px",
            }}>
                COMING SOON
            </div>
            <div style={{
                fontFamily: "sans-serif",
                fontSize: "12px", color: "rgba(200,210,220,0.3)",
                letterSpacing: "1px",
            }}>
                New {label.toLowerCase()} skins will appear here.
            </div>
        </div>
    );
}
