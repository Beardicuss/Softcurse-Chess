import { useLang } from "../i18n.js";

// ── Credits panel ────────────────────────────────────────────
export default function CreditsPanel({ onBack }) {
    const { t } = useLang();
    return (
        <div className="sub-panel" style={{ width: "100%" }}>
            <div style={{ color: "rgba(197,160,89,0.5)", fontSize: "14px", letterSpacing: "5px", marginBottom: "20px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>
                {t.CREDITS || "ABOUT & CREATORS"}
            </div>

            <div style={{
                maxHeight: "50vh",
                overflowY: "auto",
                padding: "0 10px",
                marginBottom: "20px",
                textAlign: "center",
                fontFamily: "'Cinzel', serif",
                fontSize: "12px",
                lineHeight: "1.6",
                color: "rgba(197,160,89,0.8)"
            }}>
                <div style={{ color: "#c5a059", fontSize: "20px", marginBottom: "6px", fontWeight: 700, fontFamily: "'Cinzel Decorative', serif", textShadow: "0 0 10px rgba(197,160,89,0.4)" }}>{t.ABOUT_1}</div>
                <div style={{ opacity: 0.9, color: "#e0c88a", fontSize: "13px", letterSpacing: "1px", marginBottom: "24px", fontStyle: "italic" }}>
                    {t.ABOUT_2}
                </div>

                <div style={{ marginBottom: "20px" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_3 }} />

                <div style={{ color: "#c5a059", fontSize: "14px", letterSpacing: "2px", margin: "20px 0 10px", fontWeight: 700 }}>{t.ABOUT_4}</div>
                <div style={{ marginBottom: "20px", textAlign: "left", display: "inline-block" }}>
                    {t.ABOUT_5}<br />
                    <ul style={{ paddingLeft: "20px", marginTop: "10px", color: "rgba(197,160,89,0.7)" }}>
                        <li>{t.ABOUT_6_LI1}</li>
                        <li>{t.ABOUT_6_LI2}</li>
                        <li>{t.ABOUT_6_LI3}</li>
                        <li>{t.ABOUT_6_LI4}</li>
                        <li>{t.ABOUT_6_LI5}</li>
                        <li>{t.ABOUT_6_LI6}</li>
                    </ul>
                </div>
                <div style={{ marginBottom: "20px", color: "#e0c88a", fontWeight: "bold", letterSpacing: "1px" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_7 }} />

                <div style={{ color: "#c5a059", fontSize: "14px", letterSpacing: "2px", margin: "20px 0 10px", fontWeight: 700 }}>{t.ABOUT_8}</div>
                <div style={{ marginBottom: "20px" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_9 }} />

                <div style={{ color: "#c5a059", fontSize: "14px", letterSpacing: "2px", margin: "20px 0 10px", fontWeight: 700 }}>{t.ABOUT_10}</div>
                <div style={{ marginBottom: "20px" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_11 }} />

                <div style={{ color: "#c5a059", fontSize: "14px", letterSpacing: "2px", margin: "20px 0 10px", fontWeight: 700 }}>{t.ABOUT_12}</div>
                <div style={{ marginBottom: "20px" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_13 }} />

                <div style={{ color: "#c5a059", fontSize: "14px", letterSpacing: "2px", margin: "24px 0 10px", fontWeight: 700 }}>{t.ABOUT_14}</div>
                <div style={{ marginBottom: "24px", color: "#e0c88a", fontStyle: "italic", letterSpacing: "1px" }} dangerouslySetInnerHTML={{ __html: t.ABOUT_15 }} />

                <div style={{ marginTop: "30px", padding: "15px", border: "1px solid rgba(197,160,89,0.2)", background: "rgba(197,160,89,0.05)" }}>
                    <a href="https://softcurse-website.pages.dev/" target="_blank" rel="noopener noreferrer" style={{ color: "#00ffff", textDecoration: "none", fontSize: "13px", letterSpacing: "2px", fontWeight: "bold", textShadow: "0 0 8px rgba(0,255,255,0.5)" }}>
                        {t.ABOUT_WEB}
                    </a>
                </div>
            </div>

            <div style={{ height: "1px", background: "rgba(197,160,89,0.15)", margin: "20px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "14px", opacity: 0.6, justifyContent: "center", border: "none", background: "transparent" }}>
                <span className="menu-icon">←</span>
                {t.BACK}
            </button>
        </div>
    );
}
