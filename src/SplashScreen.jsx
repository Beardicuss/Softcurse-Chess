import { useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
//  SOFTCURSE SYSTEMS — Sci-Fi Splash Screen
//  Uses logo.png directly — replaces flash_screen.mp4
//  Palette: Cyan #4aa8b8 · Cardinal #c41e3a · Graphite · Bone
// ═══════════════════════════════════════════════════════════════

const DURATION = 7000; // total ms

export default function SplashScreen({ onComplete, logoSrc = "/intro/logo.png" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const logoRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Preload logo
    const img = new Image();
    img.src = logoSrc;
    logoRef.current = img;

    let startTime = null;
    let done = false;
    let unmounted = false;

    const glow = (color, blur) => { ctx.shadowColor = color; ctx.shadowBlur = blur; };
    const noGlow = () => { ctx.shadowBlur = 0; };

    // ── Scanline grid ─────────────────────────────────────────
    function drawGrid(W, H, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.15;
      ctx.strokeStyle = "#4aa8b8";
      ctx.lineWidth = 0.5;
      noGlow();
      const sp = 40;
      for (let x = 0; x < W; x += sp) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    }

    // ── HUD corner brackets ───────────────────────────────────
    function drawCorners(W, H, alpha, progress) {
      const size = Math.min(W, H) * 0.08;
      const pad = Math.min(W, H) * 0.035;
      const pts = [[pad, pad, 1, 1], [W - pad, pad, -1, 1], [pad, H - pad, 1, -1], [W - pad, H - pad, -1, -1]];
      ctx.save();
      ctx.strokeStyle = "#4aa8b8";
      ctx.lineWidth = 1.8;
      glow("#4aa8b8", 10);
      pts.forEach(([x, y, sx, sy], i) => {
        const p = Math.min(Math.max((progress - i * 0.05) * 3, 0), 1);
        ctx.globalAlpha = alpha * p;
        ctx.beginPath();
        ctx.moveTo(x + sx * size * p, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * size * p);
        ctx.stroke();
      });
      ctx.restore();
    }

    // ── Moving scan sweep ─────────────────────────────────────
    function drawSweep(W, H, alpha, t) {
      const y = (t % 1) * H;
      ctx.save();
      const g = ctx.createLinearGradient(0, y - 50, 0, y + 50);
      g.addColorStop(0, "rgba(74,168,184,0)");
      g.addColorStop(0.5, `rgba(74,168,184,${alpha * 0.10})`);
      g.addColorStop(1, "rgba(74,168,184,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 50, W, 100);
      ctx.restore();
    }

    // ── Spinning dashed HUD rings ─────────────────────────────
    function drawRings(cx, cy, sc, alpha, progress) {
      ctx.save();
      const defs = [
        { r: 1.38, dash: [8, 18], speed: 0.04, w: 1.0, a: 0.45 },
        { r: 1.60, dash: [3, 25], speed: -0.06, w: 0.6, a: 0.28 },
        { r: 1.82, dash: [16, 10], speed: 0.025, w: 0.4, a: 0.18 },
      ];
      defs.forEach(({ r, dash, speed, w, a }, i) => {
        const rp = Math.min(Math.max((progress - i * 0.12) * 2, 0), 1);
        ctx.globalAlpha = alpha * a * rp;
        ctx.strokeStyle = "#4aa8b8";
        ctx.lineWidth = w;
        ctx.setLineDash(dash);
        ctx.lineDashOffset = (Date.now() * speed) % 200;
        glow("#4aa8b8", 8);
        ctx.beginPath(); ctx.arc(cx, cy, sc * r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Cardinal accent cross-hairs ───────────────────────────
    function drawCrosshair(W, H, alpha, progress) {
      if (progress < 0.45) return;
      const p = Math.min((progress - 0.45) / 0.55, 1);
      const cx = W / 2, cy = H / 2;
      const sc = Math.min(W, H) * 0.22;
      ctx.save();
      ctx.globalAlpha = alpha * p * 0.7;
      ctx.strokeStyle = "#c41e3a";
      ctx.lineWidth = 0.8;
      glow("#c41e3a", 14);
      // Horizontal
      ctx.beginPath(); ctx.moveTo(cx - sc * 2.5 * p, cy); ctx.lineTo(cx + sc * 2.5 * p, cy); ctx.stroke();
      // Short vertical tick center
      ctx.globalAlpha = alpha * p * 0.4;
      ctx.beginPath(); ctx.moveTo(cx, cy - sc * 0.18 * p); ctx.lineTo(cx, cy + sc * 0.18 * p); ctx.stroke();
      ctx.restore();
    }

    // ── Logo image ────────────────────────────────────────────
    function drawLogo(W, H, alpha, progress) {
      const img = logoRef.current;
      if (!img.complete || !img.naturalWidth) return;
      const sc = Math.min(W, H) * 0.22;
      const cx = W / 2, cy = H / 2 - sc * 0.12;
      const size = sc * 2.1;
      const p = Math.min(progress * 1.8, 1);

      ctx.save();
      // Outer glow pass
      ctx.globalAlpha = alpha * p * 0.35;
      glow("#4aa8b8", sc * 1.4);
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      // Sharp pass
      ctx.globalAlpha = alpha * p;
      glow("#4aa8b8", sc * 0.45);
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      noGlow();
      ctx.restore();
    }

    // ── Data readout (left side) ──────────────────────────────
    function drawData(W, H, alpha, progress) {
      if (progress < 0.45) return;
      const p = (progress - 0.45) / 0.55;
      const fs = Math.min(W, H) * 0.016;
      const lines = [
        "BOOT......OK",
        "NET.......LINK",
        "AI........ARMED",
        "SEC.......██████",
      ];
      ctx.save();
      ctx.font = `${fs}px 'JetBrains Mono','Courier New',monospace`;
      ctx.fillStyle = "#4aa8b8";
      ctx.textAlign = "left";
      glow("#4aa8b8", 6);
      lines.forEach((line, i) => {
        const lp = Math.min(Math.max((p - i * 0.18) * 3, 0), 1);
        ctx.globalAlpha = alpha * lp * 0.55;
        ctx.fillText(line, W * 0.04, H * 0.70 + i * fs * 1.9);
      });
      ctx.restore();
    }

    // ── Company name ──────────────────────────────────────────
    function drawText(W, H, alpha, progress) {
      if (progress < 0.55) return;
      const p = (progress - 0.55) / 0.45;
      const sc = Math.min(W, H);
      const lsc = Math.min(W, H) * 0.22;
      const cx = W / 2, cy = H / 2;

      ctx.save();
      ctx.textAlign = "center";

      // SOFTCURSE
      ctx.globalAlpha = alpha * p;
      ctx.fillStyle = "#ddd8cc";
      ctx.font = `200 ${sc * 0.054}px 'Rajdhani','Orbitron',monospace`;
      glow("#4aa8b8", sc * 0.028);
      ctx.fillText("SOFTCURSE", cx, cy + lsc * 1.48);

      // SYSTEMS
      ctx.globalAlpha = alpha * p * 0.85;
      ctx.fillStyle = "#4aa8b8";
      ctx.font = `400 ${sc * 0.021}px 'JetBrains Mono',monospace`;
      glow("#4aa8b8", sc * 0.015);
      ctx.fillText("S Y S T E M S", cx, cy + lsc * 1.80);

      // version
      ctx.globalAlpha = alpha * p * 0.3;
      ctx.fillStyle = "#4aa8b8";
      ctx.font = `${sc * 0.013}px 'JetBrains Mono',monospace`;
      noGlow();
      ctx.fillText("BUILD 2.0 // SYSTEM ONLINE", cx, cy + lsc * 2.10);

      ctx.restore();
    }

    // ── Render loop ───────────────────────────────────────────
    function render(ts) {
      if (done) return;
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;

      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const sc = Math.min(W, H) * 0.22;

      const progress = Math.min(elapsed / 3800, 1);
      let alpha = 1;
      if (elapsed > 6000) alpha = Math.max(0, 1 - (elapsed - 6000) / 1000);

      if (elapsed > DURATION) {
        if (!done) {
          done = true;
          ctx.clearRect(0, 0, W, H);
          if (!unmounted) onComplete?.();
        }
        return;
      }

      // Background
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#020509";
      ctx.fillRect(0, 0, W, H);

      // Center radial light
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sc * 2.5);
      rg.addColorStop(0, `rgba(74,168,184,${0.07 * alpha})`);
      rg.addColorStop(1, "rgba(2,5,9,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);

      drawGrid(W, H, alpha);
      drawSweep(W, H, alpha, elapsed / 3800);
      drawCorners(W, H, alpha, progress);
      drawRings(cx, cy, sc, alpha, progress);
      drawCrosshair(W, H, alpha, progress);
      drawLogo(W, H, alpha, progress);
      drawData(W, H, alpha, progress);
      drawText(W, H, alpha, progress);

      rafRef.current = requestAnimationFrame(render);
    }

    const t = setTimeout(() => { rafRef.current = requestAnimationFrame(render); }, 60);

    return () => {
      unmounted = true;
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [onComplete, logoSrc]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 9999,
        display: "block",
        background: "#020509",
        cursor: "none",
      }}
    />
  );
}