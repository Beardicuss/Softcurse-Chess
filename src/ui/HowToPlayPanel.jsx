import { useLang } from "../i18n.js";

// ── How to Play panel ────────────────────────────────────────
export default function HowToPlayPanel({ onBack }) {
    const { t } = useLang();
    const tips = [
        [t.HT_1.split(":")[0], t.HT_1.split(":")[1]],
        [t.HT_2.split(":")[0], t.HT_2.split(":")[1]],
        [t.HT_3.split(":")[0], t.HT_3.split(":")[1]],
        [t.HT_4.split(":")[0], t.HT_4.split(":")[1]],
        [t.HT_5.split(":")[0], t.HT_5.split(":")[1]],
        [t.HT_6.split(":")[0], t.HT_6.split(":")[1]],
    ];
    return (
        <div className="sub-panel" style={{ width: "100%" }}>
            <div style={{ color: "rgba(197,160,89,0.5)", fontSize: "14px", letterSpacing: "5px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>{t.HOW_TO_PLAY}</div>
            {tips.map(([key, val]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid rgba(197,160,89,0.1)", fontFamily: "'Cinzel', serif" }}>
                    <span style={{ color: "#c5a059", fontSize: "13px", letterSpacing: "2.5px", fontWeight: 700 }}>{key}</span>
                    <span style={{ color: "rgba(197,160,89,0.6)", fontSize: "13px", textAlign: "right", marginLeft: 10 }}>{val}</span>
                </div>
            ))}
            <div style={{ height: "1px", background: "rgba(197,160,89,0.15)", margin: "20px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "14px", opacity: 0.6, border: "none", background: "transparent" }}>
                <span className="menu-icon">←</span>
                {t.BACK}
            </button>
        </div>
    );
}
