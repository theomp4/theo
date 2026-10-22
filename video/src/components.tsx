import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE, fontFamily, shadow, tw } from "./theme";

export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

export const springAt = (t: number, at: number, fps: number, config = { damping: 16, stiffness: 120, mass: 0.9 }) =>
  spring({ frame: Math.max(0, (t - at) * fps), fps, config });

// Fond clair + halos bleus qui dérivent lentement + trame de points
export const Background: React.FC = () => {
  const t = useT();
  const halo = (x: number, y: number, r: number, a: number, k: number): React.CSSProperties => ({
    position: "absolute",
    left: x + Math.sin(t * 0.35 + k) * 60 - r,
    top: y + Math.cos(t * 0.28 + k) * 80 - r,
    width: r * 2,
    height: r * 2,
    borderRadius: "50%",
    background: `radial-gradient(circle, rgba(65,102,176,${a}) 0%, rgba(110,143,214,${a * 0.45}) 40%, rgba(244,247,252,0) 70%)`,
  });
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div style={halo(140, 260, 520, 0.22, 0)} />
      <div style={halo(980, 980, 620, 0.2, 2)} />
      <div style={halo(200, 1700, 560, 0.18, 4)} />
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(14,26,58,0.09) 1.6px, transparent 1.8px)",
          backgroundSize: "38px 38px",
          backgroundPosition: `0 ${(-t * 6) % 38}px`,
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 85%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const GoogleG: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: "block", flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export const Star: React.FC<{ size: number; color?: string; style?: React.CSSProperties }> = ({ size, color = C.star, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", ...style }}>
    <path fill={color} d="M12 1.8l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.6l-6.3 3.6 1.5-7.1L1.8 9.2 9 8.4z" />
  </svg>
);

// Étoiles qui « poppent » une par une à partir de `at` (en s)
export const StarRow: React.FC<{ size: number; at?: number; gap?: number; count?: number }> = ({ size, at = -10, gap = 4, count = 5 }) => {
  const t = useT();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", gap }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const s = springAt(t, at + i * 0.07, fps, { damping: 11, stiffness: 180, mass: 0.6 });
        return <Star key={i} size={size} color={i < count ? C.star : "#DCE3EF"} style={{ transform: `scale(${s})` }} />;
      })}
    </div>
  );
};

export const Check: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24">
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

export const Pill: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; dark?: boolean }> = ({ children, style, dark }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 30px",
      borderRadius: 999,
      background: dark ? C.blue : C.white,
      color: dark ? C.white : C.navy,
      fontFamily,
      fontWeight: 600,
      fontSize: 30,
      boxShadow: shadow.soft,
      ...style,
    }}
  >
    {children}
  </div>
);

type Word = { w: string; accent?: boolean };
export type Line = string | Word[];

// Titre animé mot par mot (flou + glissement), comme la vidéo plaque, avec sortie fluide
export const Title: React.FC<{
  lines: Line[];
  at: number;
  out?: number;
  top?: number;
  size?: number;
  stagger?: number;
}> = ({ lines, at, out = 999, top = 230, size = 82, stagger = 0.055 }) => {
  const t = useT();
  if (t < at - 0.1 || t > out + 0.8) return null;
  let i = 0;
  const parsed: Word[][] = lines.map((l) =>
    typeof l === "string" ? l.split(" ").map((w) => ({ w })) : l.flatMap((p) => p.w.split(" ").map((w) => ({ w, accent: p.accent }))),
  );
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 60,
        right: 60,
        textAlign: "center",
        fontFamily,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: -1.5,
        color: C.navy,
      }}
    >
      {parsed.map((line, li) => (
        <div key={li} style={{ display: "flex", justifyContent: "center", gap: size * 0.26, flexWrap: "nowrap" }}>
          {line.map((word, wi) => {
            const d = at + i++ * stagger;
            const p = tw(t, [d, d + 0.7], [0, 1], EASE.out);
            const o = tw(t, [out + i * 0.02, out + 0.45 + i * 0.02], [0, 1], EASE.inOut);
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  color: word.accent ? C.blue : C.navy,
                  opacity: p * (1 - o),
                  transform: `translateY(${(1 - p) * 46 - o * 40}px) scale(${0.96 + p * 0.04})`,
                  filter: `blur(${(1 - p) * 14 + o * 12}px)`,
                }}
              >
                {word.w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Sparkle: React.FC<{ x: number; y: number; at: number; size?: number }> = ({ x, y, at, size = 30 }) => {
  const t = useT();
  const p = tw(t, [at, at + 0.5], [0, 1], EASE.out);
  const f = tw(t, [at + 0.6, at + 1.4], [1, 0], EASE.inOut);
  if (p <= 0) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ position: "absolute", left: x, top: y, opacity: p * f, transform: `scale(${p}) rotate(${p * 90}deg)` }}
    >
      <path d="M12 0c1 6 6 11 12 12-6 1-11 6-12 12-1-6-6-11-12-12 6-1 11-6 12-12z" fill={C.star} />
    </svg>
  );
};
