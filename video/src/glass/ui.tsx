// Briques visuelles « glass » : fond aurore, grain, panneaux en verre, textes qui se défloutent.
import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, fontFamily, tw } from "../theme";

export const G = {
  blue: "#0055FD",
  blueHi: "#4D8BFF",
  sky: "#8FB8FF",
  navy: "#192340",
  ink: "#F2F6FF",
  muted: "rgba(226,234,255,0.66)",
  bg: "#040816",
};

export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

export const sp = (t: number, at: number, fps: number, cfg = { damping: 15, stiffness: 140, mass: 0.8 }) =>
  spring({ frame: Math.max(0, (t - at) * fps), fps, config: cfg });

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// Fond : nappes de lumière floues qui dérivent (façon fond d'écran Apple)
export const Aurora: React.FC<{ t: number; boost?: number }> = ({ t, boost = 1 }) => {
  const blob = (x: number, y: number, r: number, c: string, a: number, k: number, sx = 90, sy = 120) => (
    <div
      style={{
        position: "absolute",
        left: x + Math.sin(t * 0.32 + k) * sx - r,
        top: y + Math.cos(t * 0.26 + k * 1.3) * sy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c} 0%, transparent 68%)`,
        opacity: a * boost,
        filter: "blur(40px)",
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: G.bg, overflow: "hidden" }}>
      {blob(180, 340, 640, "#0055FD", 0.85, 0)}
      {blob(960, 820, 700, "#2C6BFF", 0.6, 2.1)}
      {blob(260, 1500, 720, "#3A2FD9", 0.55, 4.2)}
      {blob(900, 1780, 560, "#00A3FF", 0.45, 1.3)}
      {blob(560, 980, 420, "#7FB0FF", 0.22, 3.4, 160, 200)}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 70% at 50% 45%, transparent 40%, rgba(2,4,12,0.65) 100%)" }} />
    </AbsoluteFill>
  );
};

// Grain fin par-dessus tout (texture « caméra »)
export const Grain: React.FC<{ t: number }> = ({ t }) => {
  const seed = Math.floor(t * 30) % 9;
  return (
    <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={`gr${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#gr${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

// Panneau de verre dépoli, avec liseré, reflet du haut et balayage lumineux optionnel
export const Glass: React.FC<{
  style?: React.CSSProperties;
  radius?: number;
  sheen?: number; // 0 → 1 : passage du reflet
  tint?: string;
  glow?: number;
  children?: React.ReactNode;
}> = ({ style, radius = 40, sheen = -1, tint = "rgba(255,255,255,0.10)", glow = 0, children }) => (
  <div
    style={{
      position: "relative",
      borderRadius: radius,
      background: `linear-gradient(150deg, ${tint}, rgba(255,255,255,0.03))`,
      backdropFilter: "blur(34px) saturate(170%)",
      WebkitBackdropFilter: "blur(34px) saturate(170%)",
      border: "1.5px solid rgba(255,255,255,0.20)",
      boxShadow: `0 40px 90px -30px rgba(0,0,10,0.65), inset 0 1.5px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(255,255,255,0.06)${
        glow > 0 ? `, 0 0 ${80 * glow}px ${10 * glow}px rgba(0,85,253,${0.55 * glow})` : ""
      }`,
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 38%)",
        pointerEvents: "none",
      }}
    />
    {sheen > -0.5 && sheen < 1.5 && (
      <div
        style={{
          position: "absolute",
          top: -40,
          bottom: -40,
          width: "45%",
          left: `${lerp(-60, 130, sheen)}%`,
          background: "linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)",
          transform: "skewX(-18deg)",
          pointerEvents: "none",
        }}
      />
    )}
    <div style={{ position: "relative", height: "100%" }}>{children}</div>
  </div>
);

// Texte mot par mot : flou → net, montée douce
export const BlurWords: React.FC<{
  text: string;
  t: number;
  at: number;
  size: number;
  weight?: number;
  stagger?: number;
  color?: string;
  gradient?: boolean;
  style?: React.CSSProperties;
  spacing?: number;
}> = ({ text, t, at, size, weight = 700, stagger = 0.07, color = G.ink, gradient = false, style, spacing = -0.035 }) => {
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: `${spacing}em`,
        lineHeight: 1.08,
        textAlign: "center",
        color,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const a = at + i * stagger;
        const p = tw(t, [a, a + 0.6], [0, 1]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: tw(t, [a, a + 0.35], [0, 1]),
              filter: `blur(${(1 - p) * 18}px)`,
              transform: `translateY(${(1 - p) * 0.45 * size}px) scale(${lerp(0.94, 1, p)})`,
              ...(gradient
                ? {
                    backgroundImage: "linear-gradient(180deg, #FFFFFF 15%, #B9D0FF 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }
                : {}),
            }}
          >
            {w + (i < words.length - 1 ? " " : "")}
          </span>
        );
      })}
    </div>
  );
};

// Petite pastille de verre
export const Chip: React.FC<{ t: number; at: number; label: string; size?: number; active?: number; style?: React.CSSProperties }> = ({
  t,
  at,
  label,
  size = 34,
  active = 0,
  style,
}) => {
  const { fps } = useVideoConfig();
  const s = sp(t, at, fps, { damping: 13, stiffness: 170, mass: 0.7 });
  return (
    <div style={{ transform: `scale(${lerp(0.6, 1, s)})`, opacity: Math.min(1, s * 1.4), ...style }}>
      <Glass
        radius={999}
        glow={active}
        tint={active > 0 ? `rgba(0,85,253,${0.25 + 0.35 * active})` : "rgba(255,255,255,0.10)"}
        style={{ padding: `${size * 0.48}px ${size * 0.95}px` }}
      >
        <div style={{ fontFamily, fontSize: size, fontWeight: 600, color: G.ink, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{label}</div>
      </Glass>
    </div>
  );
};

export const CheckDot: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "linear-gradient(160deg, #4D8BFF, #0055FD)",
      boxShadow: "0 0 18px rgba(0,85,253,0.8), inset 0 1px 0 rgba(255,255,255,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24">
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

export const Star: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", ...style }}>
    <path fill="#FBBC05" d="M12 1.8l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.6l-6.3 3.6 1.5-7.1L1.8 9.2 9 8.4z" />
  </svg>
);

// Icône de la marque dans une tuile d'app en verre bleu
export const AppIcon: React.FC<{ size: number; reveal?: number; sheen?: number }> = ({ size, reveal = 1, sheen = -1 }) => {
  const p = reveal * 125 - 10;
  const mask = `linear-gradient(180deg, #000 ${p - 14}%, transparent ${p}%)`;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.235,
        background: "linear-gradient(160deg, #3D86FF 0%, #0055FD 48%, #0036B5 100%)",
        boxShadow: `0 ${size * 0.12}px ${size * 0.3}px -${size * 0.08}px rgba(0,40,160,0.8), 0 0 ${size * 0.35}px rgba(0,85,253,0.45), inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -${size * 0.04}px ${size * 0.1}px rgba(0,20,90,0.45)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 46%)" }} />
      <Img
        src={staticFile("rm26/rm26-icone-blanc.svg")}
        style={{
          position: "absolute",
          height: "66%",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(10px)",
          opacity: 0.55,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
      <Img
        src={staticFile("rm26/rm26-icone-blanc.svg")}
        style={{
          position: "absolute",
          height: "66%",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
      {sheen > -0.5 && sheen < 1.5 && (
        <div
          style={{
            position: "absolute",
            top: -size * 0.2,
            bottom: -size * 0.2,
            width: "40%",
            left: `${lerp(-70, 140, sheen)}%`,
            background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)",
            transform: "skewX(-20deg)",
          }}
        />
      )}
    </div>
  );
};

// Enveloppe de scène : entrée et sortie floutées, façon keynote
export const Scene: React.FC<{ t: number; from: number; to: number; children: (lt: number) => React.ReactNode; inD?: number; outD?: number }> = ({
  t,
  from,
  to,
  children,
  inD = 0.6,
  outD = 0.5,
}) => {
  // les scènes se chevauchent de 0,25 s de part et d'autre de la coupe (fondu flouté croisé)
  const end = outD > 0.05 ? to + 0.25 : to;
  if (t < from - 0.001 || t > end + 0.001) return null;
  const lt = t - from;
  const i = tw(lt, [0, inD], [0, 1]);
  const o = tw(t, [end - outD, end], [0, 1], EASE.in);
  return (
    <AbsoluteFill
      style={{
        opacity: i * (1 - o),
        filter: i < 1 || o > 0 ? `blur(${(1 - i) * 22 + o * 26}px)` : "none",
        transform: `scale(${lerp(1.07, 1, i) * lerp(1, 0.94, o)})`,
      }}
    >
      {/* l'aurore est répétée dans la scène : le verre a besoin d'un fond à flouter dans son propre groupe */}
      <Aurora t={t} />
      {children(lt)}
    </AbsoluteFill>
  );
};
