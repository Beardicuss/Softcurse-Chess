import { useState } from "react";
import { useLang, langCodes } from "../i18n.js";
import { AudioEngine } from "../audioEngine.js";

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

    // Audio volume state — read saved values from AudioEngine
    const savedVol = AudioEngine.getVolumes();
    const [masterVol, setMasterVol] = useState(Math.round(savedVol.master * 100));
    const [musicVol, setMusicVol] = useState(Math.round(savedVol.music * 100));
    const [sfxVol, setSfxVol] = useState(Math.round(savedVol.sfx * 100));

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
        <div className="sub-panel" style={{ width: "100%", maxWidth: "460px", margin: "0", textAlign: "left", paddingRight: "10px" }}>
            <div style={{
                color: "#c8cdd4", fontSize: "clamp(28px, 6vw, 42px)", letterSpacing: "4px",
                marginBottom: "32px", fontFamily: "'Cinzel Decorative', serif",
                fontWeight: 700, textShadow: "0 0 20px rgba(140,160,190,0.2)"
            }}>
                {t.SETTINGS}
            </div>

            <div style={{ marginBottom: "28px" }}>
                <div style={{ color: "#c8cdd4", fontSize: "14px", letterSpacing: "3px", marginBottom: "16px", fontWeight: 700, fontFamily: "'Cinzel Decorative', serif" }}>RESOLUTION</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {RES_OPTIONS.map((opt) => (
                        <label key={opt.label} style={{ display: "flex", alignItems: "center", gap: "16px", color: "rgba(200,210,220,0.7)", fontSize: "14px", cursor: "pointer", fontFamily: "'Cinzel', serif", letterSpacing: "2px" }}>
                            <input
                                type="radio"
                                name="resolution"
                                checked={resMatch(currentRes, opt.value)}
                                onChange={() => handleResChange(opt.value)}
                                style={{ accentColor: "#c5a059", width: "18px", height: "18px" }}
                            />
                            <span style={{ opacity: resMatch(currentRes, opt.value) ? 1 : 0.7, color: resMatch(currentRes, opt.value) ? "#e0c88a" : "inherit", textShadow: resMatch(currentRes, opt.value) ? "0 0 10px rgba(197,160,89,0.3)" : "none" }}>{opt.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.1), transparent)", margin: "24px 0" }} />

            <div style={{ marginBottom: "28px" }}>
                <div style={{ color: "#c8cdd4", fontSize: "14px", letterSpacing: "3px", marginBottom: "16px", fontWeight: 700, fontFamily: "'Cinzel Decorative', serif" }}>{t.AUDIO}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <span style={{ color: "rgba(200,210,220,0.8)", fontSize: "13px", letterSpacing: "2px", fontFamily: "sans-serif" }}>{t.MASTER}</span>
                    <input type="range" min="0" max="100" value={masterVol} onChange={(e) => { const v = Number(e.target.value); setMasterVol(v); AudioEngine.setMaster(v / 100); }} style={{ width: "140px", accentColor: "#c5a059", opacity: 0.8 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <span style={{ color: "rgba(200,210,220,0.8)", fontSize: "13px", letterSpacing: "2px", fontFamily: "sans-serif" }}>{t.MUSIC}</span>
                    <input type="range" min="0" max="100" value={musicVol} onChange={(e) => { const v = Number(e.target.value); setMusicVol(v); AudioEngine.setMusic(v / 100); }} style={{ width: "140px", accentColor: "#c5a059", opacity: 0.8 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(200,210,220,0.8)", fontSize: "13px", letterSpacing: "2px", fontFamily: "sans-serif" }}>{t.SFX}</span>
                    <input type="range" min="0" max="100" value={sfxVol} onChange={(e) => { const v = Number(e.target.value); setSfxVol(v); AudioEngine.setSfx(v / 100); }} style={{ width: "140px", accentColor: "#c5a059", opacity: 0.8 }} />
                </div>
            </div>

            <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.1), transparent)", margin: "24px 0" }} />

            <div style={{ marginBottom: "24px" }}>
                <div style={{ color: "#c8cdd4", fontSize: "14px", letterSpacing: "3px", marginBottom: "16px", fontWeight: 700, fontFamily: "'Cinzel Decorative', serif" }}>{t.LANGUAGE}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {LANG_LABELS.map((l, i) => {
                        const isSelected = lang === langCodes[i];
                        return (
                            <label key={l} style={{ display: "flex", alignItems: "center", gap: "16px", color: "rgba(200,210,220,0.7)", fontSize: "14px", cursor: "pointer", fontFamily: "'Cinzel', serif", letterSpacing: "2px" }}>
                                <input
                                    type="radio"
                                    name="lang"
                                    checked={isSelected}
                                    onChange={() => setLang(langCodes[i])}
                                    style={{ accentColor: "#c5a059", width: "18px", height: "18px" }}
                                />
                                <span style={{ opacity: isSelected ? 1 : 0.7, color: isSelected ? "#e0c88a" : "inherit", textShadow: isSelected ? "0 0 10px rgba(197,160,89,0.3)" : "none" }}>{l}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(200,210,220,0.15), transparent)", margin: "32px 0 24px 0" }} />
            <button className="menu-item" onClick={onBack} style={{ fontSize: "15px", opacity: 0.6 }}>
                <span className="menu-icon">←</span>
                {t.BACK}
            </button>
        </div>
    );
}
