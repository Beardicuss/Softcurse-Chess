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
        <div className="sub-panel" style={{ width: "100%", maxWidth: "460px", margin: "0 auto" }}>
            {/* Title */}
            <div style={{
                color: "rgba(197,160,89,0.5)", fontSize: "14px", letterSpacing: "5px",
                marginBottom: "20px", fontFamily: "'Cinzel Decorative', serif",
                textAlign: "center", fontWeight: 700,
            }}>
                {t.TREASURY || "TREASURY"}
            </div>

            {/* Tabs */}
            <div style={{
                display: "flex", gap: "0", marginBottom: "20px",
                border: "1px solid rgba(197,160,89,0.2)", overflow: "hidden",
            }}>
                {TABS.map((tb) => (
                    <button
                        key={tb}
                        onClick={() => setTab(tb)}
                        style={{
                            flex: 1, padding: "10px 0",
                            background: tab === tb ? "rgba(197,160,89,0.15)" : "rgba(5,1,10,0.4)",
                            color: tab === tb ? "#c5a059" : "rgba(197,160,89,0.4)",
                            border: "none", borderRight: "1px solid rgba(197,160,89,0.1)",
                            fontFamily: "'Cinzel', serif", fontSize: "11px",
                            letterSpacing: "3px", fontWeight: 700, cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                    >
                        {t[tb] || tb}
                    </button>
                ))}
            </div>

            {/* PIECES Tab */}
            {tab === "PIECES" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {PIECE_SKINS.map((skin) => {
                        const isActive = activeSkin === skin.id;
                        return (
                            <button
                                key={skin.id}
                                onClick={() => handleSelect(skin.id)}
                                style={{
                                    width: "100%",
                                    background: isActive ? "rgba(197,160,89,0.12)" : "rgba(5,1,10,0.4)",
                                    border: `1px solid ${isActive ? "#c5a059" : "rgba(197,160,89,0.15)"}`,
                                    padding: "16px 20px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.25s ease",
                                    boxShadow: isActive ? "0 0 20px rgba(197,160,89,0.15), inset 0 0 30px rgba(197,160,89,0.05)" : "none",
                                    position: "relative",
                                    overflow: "hidden",
                                }}
                            >
                                {/* Equipped badge */}
                                {isActive && (
                                    <div style={{
                                        position: "absolute", top: "8px", right: "12px",
                                        color: "#c5a059", fontSize: "10px", letterSpacing: "2px",
                                        fontFamily: "'Cinzel', serif", fontWeight: 700,
                                        opacity: 0.8,
                                    }}>
                                        ✦ EQUIPPED
                                    </div>
                                )}

                                {/* Icon + Name */}
                                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "24px" }}>{skin.icon}</span>
                                    <span style={{
                                        fontFamily: "'Cinzel Decorative', serif",
                                        fontSize: "15px", fontWeight: 700,
                                        color: isActive ? "#e0c88a" : "rgba(197,160,89,0.7)",
                                        letterSpacing: "2px",
                                    }}>
                                        {skin.name}
                                    </span>
                                </div>

                                {/* Description */}
                                <div style={{
                                    fontFamily: "'Cinzel', serif", fontSize: "11px",
                                    color: "rgba(197,160,89,0.45)", letterSpacing: "1px",
                                    paddingLeft: "38px",
                                }}>
                                    {skin.description}
                                </div>
                            </button>
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
            <div style={{ height: "1px", background: "rgba(197,160,89,0.15)", margin: "20px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "14px", opacity: 0.6, border: "none", background: "transparent" }}>
                <span className="menu-icon">←</span>
                {t.BACK}
            </button>
        </div>
    );
}

function ComingSoon({ items, label }) {
    return (
        <div style={{
            textAlign: "center", padding: "40px 20px",
            border: "1px solid rgba(197,160,89,0.1)",
            background: "rgba(5,1,10,0.3)",
        }}>
            <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>🔒</div>
            <div style={{
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: "14px", color: "rgba(197,160,89,0.3)",
                letterSpacing: "4px", fontWeight: 700, marginBottom: "8px",
            }}>
                COMING SOON
            </div>
            <div style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "11px", color: "rgba(197,160,89,0.2)",
                letterSpacing: "1px",
            }}>
                New {label.toLowerCase()} skins will appear here
            </div>
        </div>
    );
}
