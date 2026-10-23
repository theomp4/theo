// Briques communes du montage V3 : grille rythmique, easing, flou de mouvement, grain, flashs.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const BPM = 120;
export const BEAT = 60 / BPM;
/** temps (s) du temps n */
export const b = (n: number) => n * BEAT;
export const TOTAL_BEATS = 50;

export const D = {
  ink: "#04060E",
  night: "#081022",
  blue: "#4166B0",
  bright: "#5B86E5",
  sky: "#A9C1F5",
  white: "#FFFFFF",
  mute: "rgba(255,255,255,0.62)",
};
export const POP = "Poppins, sans-serif";

export const E = {
  expo: Easing.bezier(0.16, 1, 0.3, 1),
  snap: Easing.bezier(0.05, 0.9, 0.1, 1),
  inOut: Easing.bezier(0.76, 0, 0.24, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
};

export const tw = (t: number, r: [number, number], o: [number, number], ease: (x: number) => number = E.expo) =>
  interpolate(t, r, o, { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Permet de ralentir/figer le temps d'une scène (tape stop) */
export const TimeCtx = React.createContext<number | null>(null);

export const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const warped = React.useContext(TimeCtx);
  return warped ?? f / fps;
};

/** impulsion qui retombe après chaque coup de kick (0..1) */
export const kickPulse = (t: number, from: number, to: number, decay = 0.14) => {
  if (t < b(from) || t >= b(to)) return 0;
  const since = (t - b(from)) % BEAT;
  return Math.exp(-since / decay);
};

/** petit tremblement pseudo-aléatoire déterministe */
export const shake = (t: number, at: number, amp: number, dur = 0.35) => {
  const k = t - at;
  if (k < 0 || k > dur) return { x: 0, y: 0, r: 0 };
  const a = amp * Math.pow(1 - k / dur, 2);
  return { x: Math.sin(k * 97) * a, y: Math.cos(k * 83) * a, r: Math.sin(k * 61) * a * 0.04 };
};

let uid = 0;
/** Flou directionnel (flou de mouvement) via filtre SVG ; bx/by en px */
export const MotionBlur: React.FC<{ bx?: number; by?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ bx = 0, by = 0, style, children }) => {
  const id = React.useMemo(() => `mb${uid++}`, []);
  const on = Math.abs(bx) > 0.3 || Math.abs(by) > 0.3;
  return (
    <div style={{ position: "absolute", inset: 0, filter: on ? `url(#${id})` : undefined, ...style }}>
      {on && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <filter id={id} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={`${Math.abs(bx)} ${Math.abs(by)}`} />
            </filter>
          </defs>
        </svg>
      )}
      {children}
    </div>
  );
};

/** Fond nuit : halos bleus mouvants + vignette */
export const Night: React.FC<{ tint?: string; energy?: number }> = ({ tint = D.blue, energy = 0 }) => {
  const t = useT();
  const blob = (x: number, y: number, r: number, c: string, a: number, k: number): React.CSSProperties => ({
    position: "absolute",
    left: x + Math.sin(t * 0.5 + k) * 90 - r,
    top: y + Math.cos(t * 0.4 + k) * 120 - r,
    width: r * 2,
    height: r * 2,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${c} 0%, transparent 65%)`,
    opacity: a,
  });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 40%, ${D.night} 0%, ${D.ink} 70%)`, overflow: "hidden" }}>
      <div style={blob(200, 380, 700, tint, 0.38 + energy * 0.2, 0)} />
      <div style={blob(900, 1500, 800, D.blue, 0.32 + energy * 0.15, 2.1)} />
      <div style={blob(950, 300, 500, "#2A3F8F", 0.4, 4.2)} />
      <AbsoluteFill
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "90px 90px",
          backgroundPosition: `0 ${(t * 40) % 90}px`,
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 50%, black 0%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 50%, black 0%, transparent 80%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Grain ciné + vignette (au-dessus de tout) */
export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const ox = (f * 137) % 256;
  const oy = (f * 61) % 256;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile("fx/grain.png")})`, backgroundPosition: `${ox}px ${oy}px`, opacity: 0.09, mixBlendMode: "overlay" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

/** Flash blanc sur les impacts */
export const Flash: React.FC<{ at: number[]; dur?: number; color?: string; max?: number }> = ({ at, dur = 0.22, color = "#fff", max = 0.9 }) => {
  const t = useT();
  let o = 0;
  for (const a of at) {
    if (t >= a && t < a + dur) o = Math.max(o, max * Math.pow(1 - (t - a) / dur, 2));
  }
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen" }} />;
};

/** Onde de choc circulaire */
export const Shockwave: React.FC<{ at: number; x?: number; y?: number; color?: string; size?: number }> = ({ at, x = 540, y = 960, color = D.sky, size = 1600 }) => {
  const t = useT();
  const p = tw(t, [at, at + 0.7], [0, 1], E.expo);
  if (t < at || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${18 * (1 - p) + 1}px solid ${color}`,
        opacity: (1 - p) * 0.8,
        transform: `scale(${0.05 + p})`,
        boxShadow: `0 0 80px ${color}`,
      }}
    />
  );
};

/** Rayons lumineux tournants derrière un élément */
export const Rays: React.FC<{ at: number; until: number; x?: number; y?: number; color?: string }> = ({ at, until, x = 540, y = 960, color = "rgba(91,134,229,0.5)" }) => {
  const t = useT();
  const o = tw(t, [at, at + 0.3], [0, 1]) * (1 - tw(t, [until - 0.3, until], [0, 1]));
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 1400,
        top: y - 1400,
        width: 2800,
        height: 2800,
        opacity: o,
        transform: `rotate(${t * 25}deg)`,
        background: `repeating-conic-gradient(from 0deg, ${color} 0deg 4deg, transparent 4deg 18deg)`,
        maskImage: "radial-gradient(circle, black 0%, transparent 45%)",
        WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 45%)",
      }}
    />
  );
};

/** Texte en dégradé bleu → ciel → blanc qui scintille */
export const gradText = (t: number): React.CSSProperties => ({
  backgroundImage: `linear-gradient(100deg, ${D.bright} 0%, ${D.sky} ${30 + Math.sin(t * 2) * 10}%, #fff 50%, ${D.sky} 70%, ${D.bright} 100%)`,
  backgroundSize: "200% 100%",
  backgroundPosition: `${(t * 60) % 200}% 0`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
});

/** Mot qui « slamme » : grossit + net en ~0.15 s */
export const Slam: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; from?: number }> = ({ at, children, style, from = 1.7 }) => {
  const t = useT();
  const p = tw(t, [at, at + 0.16], [0, 1], E.snap);
  if (t < at) return <div style={{ ...style, visibility: "hidden" }}>{children}</div>;
  return (
    <div style={{ transform: `scale(${from - (from - 1) * p})`, filter: `blur(${(1 - p) * 18}px)`, opacity: Math.min(1, p * 3), ...style }}>{children}</div>
  );
};

/** Ligne dont le contenu monte depuis un masque (révélation éditoriale) */
export const MaskUp: React.FC<{ at: number; out?: number; children: React.ReactNode; style?: React.CSSProperties; dur?: number }> = ({ at, out = 1e9, children, style, dur = 0.4 }) => {
  const t = useT();
  const p = tw(t, [at, at + dur], [0, 1], E.expo);
  const o = tw(t, [out, out + 0.25], [0, 1], E.inOut);
  if (t < at) return null;
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.08em", ...style }}>
      <div style={{ transform: `translateY(${(1 - p) * 110 - o * 110}%)`, filter: `blur(${o * 6}px)` }}>{children}</div>
    </div>
  );
};

/** Mot qui défile comme une machine à sous entre plusieurs valeurs */
export const Roller: React.FC<{ items: { at: number; node: React.ReactNode }[]; height: number; style?: React.CSSProperties }> = ({ items, height, style }) => {
  const t = useT();
  return (
    <div style={{ position: "relative", height, overflow: "hidden", ...style }}>
      {items.map((it, i) => {
        const next = items[i + 1]?.at ?? 1e9;
        const pin = tw(t, [it.at, it.at + 0.28], [1, 0], E.expo);
        const pout = tw(t, [next, next + 0.28], [0, -1], E.expo);
        if (t < it.at - 0.01 || t > next + 0.3) return null;
        const y = (pin + pout) * height;
        return (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 0, height, transform: `translateY(${y}px)`, filter: `blur(${Math.abs(pin + pout) * 10}px)`, display: "flex", justifyContent: "center", alignItems: "center" }}>
            {it.node}
          </div>
        );
      })}
    </div>
  );
};

export const Photo: React.FC<{ src: string; style?: React.CSSProperties; zoom?: number; pos?: string }> = ({ src, style, zoom = 1, pos = "center" }) => (
  <div style={{ overflow: "hidden", position: "relative", ...style }}>
    <Img src={staticFile(`photos/${src}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, transform: `scale(${zoom})` }} />
  </div>
);

export const Sparkle: React.FC<{ x: number; y: number; at: number; size?: number; color?: string }> = ({ x, y, at, size = 34, color = "#fff" }) => {
  const t = useT();
  const p = tw(t, [at, at + 0.35], [0, 1]);
  const f = tw(t, [at + 0.4, at + 1.1], [1, 0], E.inOut);
  if (p <= 0 || f <= 0) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", left: x - size / 2, top: y - size / 2, opacity: p * f, transform: `scale(${p}) rotate(${p * 120}deg)`, filter: `drop-shadow(0 0 8px ${D.sky})` }}>
      <path d="M12 0c1 6 6 11 12 12-6 1-11 6-12 12-1-6-6-11-12-12 6-1 11-6 12-12z" fill={color} />
    </svg>
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
