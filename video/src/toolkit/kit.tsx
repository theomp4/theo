// Briques du film « toolkit » : fond clair bleuté, verre clair, lettres qui se défloutent, frappe au clavier.
import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { measureText } from "@remotion/layout-utils";
import { EASE, fontFamily, tw } from "../theme";

export const K = {
  blue: "#0055FD",
  deep: "#1F45E8",
  cyan: "#A6F0FF",
  ink: "#FFFFFF",
  soft: "rgba(255,255,255,0.78)",
};
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};
export const sp = (t: number, at: number, fps: number, cfg = { damping: 15, stiffness: 130, mass: 0.8 }) =>
  spring({ frame: Math.max(0, (t - at) * fps), fps, config: cfg });

export const shadowText = "0 6px 30px rgba(10,40,170,0.35), 0 1px 2px rgba(10,40,170,0.25)";

// Fond : blanc en haut, bleu de marque en bas, lueurs qui dérivent, grille très fine
export const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const glow = (x: number, y: number, r: number, a: number, k: number) => (
    <div
      style={{
        position: "absolute",
        left: x + Math.sin(t * 0.3 + k) * 120 - r,
        top: y + Math.cos(t * 0.24 + k) * 140 - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,255,255,${a}) 0%, rgba(255,255,255,0) 65%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #DCE6FF 0%, #9EB6FF 20%, #6A8BFF 46%, #3D6BFF 74%, #2A57F5 100%)", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 40% at 15% 60%, rgba(120,90,255,0.35), transparent 70%)" }} />
      {glow(860, 300, 700, 0.5, 0)}
      {glow(160, 1250, 560, 0.35, 2)}
      {glow(940, 1700, 520, 0.28, 4)}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          backgroundPosition: `${(t * 8) % 96}px ${(t * 14) % 96}px`,
          maskImage: "linear-gradient(180deg, transparent 0%, #000 40%, #000 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 40%, #000 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// Verre clair
export const Pane: React.FC<{
  style?: React.CSSProperties;
  radius?: number;
  strength?: number;
  outline?: boolean;
  glow?: number;
  children?: React.ReactNode;
}> = ({ style, radius = 32, strength = 1, outline = false, glow = 0, children }) => (
  <div
    style={{
      position: "relative",
      borderRadius: radius,
      background: outline
        ? "rgba(255,255,255,0.10)"
        : `linear-gradient(160deg, rgba(255,255,255,${0.62 * strength}) 0%, rgba(255,255,255,${0.26 * strength}) 100%)`,
      backdropFilter: "blur(26px) saturate(150%)",
      WebkitBackdropFilter: "blur(26px) saturate(150%)",
      border: `${outline ? 2 : 1.5}px solid rgba(255,255,255,${outline ? 0.85 : 0.75})`,
      boxShadow: `0 30px 60px -24px rgba(20,40,150,0.35), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -10px 30px rgba(120,150,255,0.18)${
        glow ? `, 0 0 ${60 * glow}px rgba(255,255,255,${0.7 * glow})` : ""
      }`,
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

// Lettres qui apparaissent une à une, floues puis nettes (couleur d'accent à partir d'un mot)
export const Letters: React.FC<{
  text: string;
  t: number;
  at: number;
  size: number;
  per?: number;
  accentFrom?: number; // index du premier mot en couleur d'accent
  weight?: number;
  color?: string;
  align?: "center" | "left";
  out?: number; // 0 → 1 : disparition
}> = ({ text, t, at, size, per = 0.032, accentFrom = 99, weight = 600, color = K.ink, align = "center", out = 0 }) => {
  let w = 0;
  return (
    <div style={{ fontFamily, fontSize: size, fontWeight: weight, letterSpacing: "-0.03em", lineHeight: 1.12, textAlign: align, color, textShadow: shadowText, whiteSpace: "pre-wrap" }}>
      {text.split("").map((ch, i) => {
        if (ch === " ") w++;
        const a = at + i * per;
        const p = tw(t, [a, a + 0.45], [0, 1]);
        const o = clamp01(out * 1.6 - (i / text.length) * 0.6);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: p * (1 - o),
              filter: `blur(${(1 - p) * 14 + o * 12}px)`,
              transform: `translateX(${(1 - p) * 0.25 * size}px)`,
              color: w >= accentFrom ? K.cyan : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// Texte tapé au clavier, avec curseur clignotant
export const typedCount = (t: number, at: number, len: number, rate = 0.075) => Math.max(0, Math.min(len, Math.floor((t - at) / rate) + 1));
export const Typed: React.FC<{
  text: string;
  t: number;
  at: number;
  size: number;
  rate?: number;
  weight?: number;
  accentFrom?: number;
  caret?: boolean;
  accentColor?: string;
  style?: React.CSSProperties;
}> = ({ text, t, at, size, rate = 0.075, weight = 600, accentFrom = 99, caret = true, accentColor = K.cyan, style }) => {
  const n = t < at ? 0 : typedCount(t, at, text.length, rate);
  const done = n >= text.length;
  const blink = done ? Math.floor((t - at - text.length * rate) * 2.4) % 2 === 0 : true;
  let w = 0;
  return (
    <div style={{ fontFamily, fontSize: size, fontWeight: weight, letterSpacing: "-0.03em", lineHeight: 1.1, whiteSpace: "nowrap", color: K.ink, textShadow: shadowText, ...style }}>
      {text.split("").map((ch, i) => {
        if (ch === " ") w++;
        return (
          <span key={i} style={{ opacity: i < n ? 1 : 0, color: w >= accentFrom ? accentColor : undefined }}>
            {ch}
          </span>
        );
      })}
      {caret && (
        <span
          style={{
            display: "inline-block",
            width: Math.max(3, size * 0.06),
            height: size * 0.95,
            marginLeft: size * 0.04,
            verticalAlign: "-0.12em",
            borderRadius: 4,
            background: "linear-gradient(180deg, #FFFFFF, #A6F0FF)",
            opacity: blink ? 1 : 0,
            // le curseur reste à la fin du texte tapé : les lettres non tapées sont transparentes,
            // on le recule donc de leur largeur
            transform: `translateX(-${measureText({ text: text.slice(n), fontFamily, fontSize: size, fontWeight: String(weight), letterSpacing: `${-0.03 * size}px` }).width}px)`,
          }}
        />
      )}
    </div>
  );
};

export const textWidth = (text: string, size: number, weight = 600) =>
  measureText({ text, fontFamily, fontSize: size, fontWeight: String(weight), letterSpacing: `${-0.03 * size}px` }).width;

// Enveloppe de scène : entrée en avançant dans la profondeur, sortie en traversant l'écran
export const Scene: React.FC<{ t: number; from: number; to: number; children: (lt: number) => React.ReactNode; first?: boolean; last?: boolean }> = ({
  t,
  from,
  to,
  children,
  first,
  last,
}) => {
  const end = last ? to : to + 0.25;
  if (t < from - 0.001 || t > end + 0.001) return null;
  const lt = t - from;
  const i = first ? 1 : tw(lt, [0, 0.55], [0, 1]);
  const o = last ? 0 : tw(t, [end - 0.5, end], [0, 1], EASE.in);
  const blur = (1 - i) * 16 + o * 22;
  return (
    <AbsoluteFill
      style={{
        opacity: i * (1 - o),
        filter: blur > 0.05 ? `blur(${blur}px)` : "none",
        transform: `scale(${lerp(0.82, 1, i) * lerp(1, 1.28, o)})`,
      }}
    >
      <Backdrop t={t} />
      {children(lt)}
    </AbsoluteFill>
  );
};

export const Shot: React.FC<{ name: string; style?: React.CSSProperties }> = ({ name, style }) => (
  <Img src={staticFile(`toolkit/${name}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }} />
);

// Pointeur de souris en verre
export const Pointer: React.FC<{ size: number; press?: number }> = ({ size, press = 0 }) => (
  <svg width={size} height={size * 1.15} viewBox="0 0 40 46" style={{ display: "block", transform: `scale(${1 - 0.12 * press})`, filter: "drop-shadow(0 10px 16px rgba(20,40,150,0.35))" }}>
    <defs>
      <linearGradient id="ptr" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
        <stop offset="1" stopColor="#9FB8FF" stopOpacity="0.85" />
      </linearGradient>
    </defs>
    <path d="M4 3 L36 22 L22 25 L15 41 Z" fill="url(#ptr)" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const Stars: React.FC<{ size: number; t?: number; at?: number }> = ({ size, t = 99, at = 0 }) => {
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", gap: size * 0.12 }}>
      {[0, 1, 2, 3, 4].map((k) => {
        const s = sp(t, at + k * 0.07, fps, { damping: 11, stiffness: 190, mass: 0.6 });
        return (
          <svg key={k} width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${s})` }}>
            <path fill="#FFB800" d="M12 1.8l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.6l-6.3 3.6 1.5-7.1L1.8 9.2 9 8.4z" />
          </svg>
        );
      })}
    </div>
  );
};

export { fontFamily, tw, EASE };
