import { useLang } from "../i18n.js";

// ── Credits panel ────────────────────────────────────────────
export default function CreditsPanel({ onBack }) {
    const { t } = useLang();
    return (
        <div className="sub-panel" style={{ width: "100%", maxWidth: "600px", margin: "0", textAlign: "left", paddingRight: "10px" }}>
            <div style={{
                color: "#c8cdd4", fontSize: "clamp(28px, 6vw, 42px)", letterSpacing: "4px",
                marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif",
                fontWeight: 700, textShadow: "0 0 20px rgba(140,160,190,0.2)"
            }}>
                {t.CREDITS || "ABOUT & CREATORS"}
            </div>

            <div style={{
                maxHeight: "50vh",
                overflowY: "auto",
                paddingRight: "12px",
                marginBottom: "24px",
                textAlign: "left",
                fontFamily: "sans-serif",
                fontSize: "13px",
                lineHeight: "1.7",
                color: "rgba(200,210,220,0.7)"
            }}>
                <div style={{ color: "#c8cdd4", fontSize: "22px", marginBottom: "8px", fontWeight: 700, fontFamily: "'Cinzel Decorative', serif", textShadow: "0 0 15px rgba(200,210,220,0.3)" }}>{t.ABOUT_1}</div>
                <div style={{ opacity: 0.9, color: "#e0c88a", fontSize: "14px", letterSpacing: "1px", marginBottom: "28px", fontStyle: "italic", fontFamily: "'Cinzel', serif" }}>
                    {t.ABOUT_2}
                </div>

                <div style={{ marginBottom: "24px", paddingLeft: "16px", borderLeft: "2px solid rgba(200,210,220,0.1)" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_3 }} />

                <div style={{ color: "#c8cdd4", fontSize: "15px", letterSpacing: "3px", margin: "24px 0 12px", fontWeight: 700, fontFamily: "'Cinzel', serif" }}>{t.ABOUT_4}</div>
                <div style={{ marginBottom: "24px", textAlign: "left", display: "block" }}>
                    {t.ABOUT_5}<br />
                    <ul style={{ paddingLeft: "20px", marginTop: "12px", color: "rgba(200,210,220,0.6)", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <li>{t.ABOUT_6_LI1}</li>
                        <li>{t.ABOUT_6_LI2}</li>
                        <li>{t.ABOUT_6_LI3}</li>
                        <li>{t.ABOUT_6_LI4}</li>
                        <li>{t.ABOUT_6_LI5}</li>
                        <li>{t.ABOUT_6_LI6}</li>
                    </ul>
                </div>
                <div style={{ marginBottom: "24px", color: "#e0c88a", fontWeight: "bold", letterSpacing: "1px", paddingLeft: "16px", borderLeft: "2px solid rgba(197,160,89,0.3)" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_7 }} />

                <div style={{ color: "#c8cdd4", fontSize: "15px", letterSpacing: "3px", margin: "24px 0 12px", fontWeight: 700, fontFamily: "'Cinzel', serif" }}>{t.ABOUT_8}</div>
                <div style={{ marginBottom: "24px" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_9 }} />

                <div style={{ color: "#c8cdd4", fontSize: "15px", letterSpacing: "3px", margin: "24px 0 12px", fontWeight: 700, fontFamily: "'Cinzel', serif" }}>{t.ABOUT_10}</div>
                <div style={{ marginBottom: "24px" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_11 }} />

                <div style={{ color: "#c8cdd4", fontSize: "15px", letterSpacing: "3px", margin: "24px 0 12px", fontWeight: 700, fontFamily: "'Cinzel', serif" }}>{t.ABOUT_12}</div>
                <div style={{ marginBottom: "24px" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_13 }} />

                <div style={{ color: "#c8cdd4", fontSize: "15px", letterSpacing: "3px", margin: "28px 0 12px", fontWeight: 700, fontFamily: "'Cinzel', serif" }}>{t.ABOUT_14}</div>
                <div style={{ marginBottom: "32px", color: "#e0c88a", fontStyle: "italic", letterSpacing: "1px", paddingLeft: "16px", borderLeft: "2px solid rgba(197,160,89,0.3)" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_15 }} />

                <div style={{ marginTop: "30px", padding: "16px 20px", background: "linear-gradient(90deg, rgba(8,12,20,0.8), transparent)", borderLeft: "3px solid #00ffff" }}>
                    <a href="https://softcurse-website.pages.dev/" target="_blank" rel="noopener noreferrer" style={{ color: "#00ffff", textDecoration: "none", fontSize: "14px", letterSpacing: "3px", fontWeight: "bold", textShadow: "0 0 10px rgba(0,255,255,0.4)", fontFamily: "'Cinzel', serif" }}>
                        {t.ABOUT_WEB}
                    </a>
                </div>
            </div>

            <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.15), transparent)", margin: "24px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "15px", opacity: 0.6 }}>
                <span className="menu-icon">←</span>
                {t.BACK}
            </button>
        </div>
    );
}
