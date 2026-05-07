// ── Decorative crest SVG ─────────────────────────────────────
export default function Crest() {
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
