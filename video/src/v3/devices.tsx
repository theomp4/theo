import React from "react";

/** Fenêtre de navigateur sombre et vitrée ; `children` est rendu à la taille du site (siteW × siteH) puis réduit */
export const Browser: React.FC<{ w: number; siteW?: number; siteH?: number; url: string; children: React.ReactNode; radius?: number; glow?: string }> = ({
  w,
  siteW = 1280,
  siteH = 800,
  url,
  children,
  radius = 18,
  glow = "rgba(91,134,229,0.35)",
}) => {
  const s = w / siteW;
  const bar = Math.max(26, 44 * (w / 960));
  return (
    <div
      style={{
        width: w,
        height: siteH * s + bar,
        borderRadius: radius,
        overflow: "hidden",
        background: "#141821",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: `0 60px 120px -30px rgba(0,0,0,0.8), 0 0 90px -10px ${glow}`,
        position: "relative",
      }}
    >
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.18, padding: `0 ${bar * 0.45}px`, background: "linear-gradient(180deg,#1C2130,#151925)" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: bar * 0.27, height: bar * 0.27, borderRadius: "50%", background: c }} />
        ))}
        <div
          style={{
            marginLeft: bar * 0.4,
            flex: 1,
            maxWidth: w * 0.5,
            height: bar * 0.58,
            borderRadius: bar,
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.75)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: bar * 0.34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <svg width={bar * 0.28} height={bar * 0.28} viewBox="0 0 24 24">
            <path d="M6 10V8a6 6 0 1 1 12 0v2h1v12H5V10h1zm2 0h8V8a4 4 0 1 0-8 0v2z" fill="rgba(255,255,255,0.7)" />
          </svg>
          {url}
        </div>
      </div>
      <div style={{ position: "relative", width: w, height: siteH * s, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: siteW, height: siteH, transformOrigin: "0 0", transform: `scale(${s})` }}>{children}</div>
      </div>
    </div>
  );
};

/** Téléphone ; le contenu est rendu en largeur `contentW` puis réduit */
export const Phone: React.FC<{ w: number; h: number; contentW?: number; children: React.ReactNode; glow?: string }> = ({ w, h, contentW = 390, children, glow = "rgba(91,134,229,0.35)" }) => {
  const bezel = w * 0.035;
  const iw = w - bezel * 2;
  const s = iw / contentW;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: w * 0.15,
        background: "linear-gradient(145deg,#2A2F3A,#0B0D12)",
        padding: bezel,
        boxSizing: "border-box",
        boxShadow: `0 50px 100px -25px rgba(0,0,0,0.85), 0 0 80px -10px ${glow}, inset 0 0 0 1.5px rgba(255,255,255,0.18)`,
        position: "relative",
      }}
    >
      <div style={{ position: "relative", width: iw, height: h - bezel * 2, borderRadius: w * 0.12, overflow: "hidden", background: "#000" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: contentW, height: (h - bezel * 2) / s, transformOrigin: "0 0", transform: `scale(${s})` }}>{children}</div>
        <div style={{ position: "absolute", top: w * 0.03, left: "50%", width: w * 0.3, height: w * 0.085, marginLeft: -w * 0.15, borderRadius: w, background: "#000" }} />
      </div>
    </div>
  );
};
