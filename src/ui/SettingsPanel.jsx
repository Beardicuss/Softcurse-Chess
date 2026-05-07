import { useState } from "react";
import { useLang, langCodes } from "../i18n.js";

// ── Settings panel ───────────────────────────────────────────
export default function SettingsPanel({ onBack }) {
    const { t, lang, setLang } = useLang();
    const LANG_LABELS = ["ENGLISH", "РУССКИЙ", "ქართული"];

    const RES_OPTIONS = [
        { label: "NATIVE", value: null },
        { label: "1280 × 720", value: [1280, 720] },
        { label: "1366 × 768", value: [1366, 768] },
        { label: "1920 × 1080", value: [1920, 1080] },
        { label: "2560 × 1440", value: [2560, 1440] },
    ];

    const getSavedRes = () => {
        try { const r = localStorage.getItem('battleChessRes'); return r ? JSON.parse(r) : null; } catch (e) { return null; }
    };
    const [currentRes, setCurrentRes] = useState(getSavedRes);

    const handleResChange = (val) => {
        setCurrentRes(val);
        window._battleChessSetResolution?.(val);
    };

    const resMatch = (a, b) => {
        if (a === null && b === null) return true;
        if (a === null || b === null) return false;
        return a[0] === b[0] && a[1] === b[1];
    };

    return (
        <div className="sub-panel" style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}>
            <div style={{ color: "rgba(197,160,89,0.5)", fontSize: "14px", letterSpacing: "5px", marginBottom: "24px", fontFamily: "'Cinzel Decorative', serif", textAlign: "center", fontWeight: 700 }}>{t.SETTINGS}</div>

            <div style={{ marginBottom: "20px" }}>
                <div style={{ color: "#c5a059", fontSize: "13px", letterSpacing: "3px", marginBottom: "12px", fontWeight: 700 }}>RESOLUTION</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {RES_OPTIONS.map((opt) => (
                        <label key={opt.label} style={{ display: "flex", alignItems: "center", gap: "12px", color: "rgba(197,160,89,0.8)", fontSize: "13px", cursor: "pointer" }}>
                            <input
                                type="radio"
                                name="resolution"
                                checked={resMatch(currentRes, opt.value)}
                                onChange={() => handleResChange(opt.value)}
                                style={{ accentColor: "#c5a059", width: "16px", height: "16px" }}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <div style={{ color: "#c5a059", fontSize: "13px", letterSpacing: "3px", marginBottom: "12px", fontWeight: 700 }}>{t.AUDIO}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ color: "rgba(197,160,89,0.8)", fontSize: "13px" }}>{t.MASTER}</span>
                    <input type="range" min="0" max="100" defaultValue="100" style={{ width: "120px", accentColor: "#c5a059" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ color: "rgba(197,160,89,0.8)", fontSize: "13px" }}>{t.MUSIC}</span>
                    <input type="range" min="0" max="100" defaultValue="80" style={{ width: "120px", accentColor: "#c5a059" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(197,160,89,0.8)", fontSize: "13px" }}>{t.SFX}</span>
                    <input type="range" min="0" max="100" defaultValue="100" style={{ width: "120px", accentColor: "#c5a059" }} />
                </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <div style={{ color: "#c5a059", fontSize: "13px", letterSpacing: "3px", marginBottom: "12px", fontWeight: 700 }}>{t.LANGUAGE}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {LANG_LABELS.map((l, i) => (
                        <label key={l} style={{ display: "flex", alignItems: "center", gap: "12px", color: "rgba(197,160,89,0.8)", fontSize: "13px", cursor: "pointer" }}>
                            <input
                                type="radio"
                                name="lang"
                                checked={lang === langCodes[i]}
                                onChange={() => setLang(langCodes[i])}
                                style={{ accentColor: "#c5a059", width: "16px", height: "16px" }}
                            />
                            {l}
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ height: "1px", background: "rgba(197,160,89,0.15)", margin: "20px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "14px", opacity: 0.6, border: "none", background: "transparent" }}>
                <span className="menu-icon">←</span>
                {t.BACK}
            </button>
        </div>
    );
}
