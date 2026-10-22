// « Review Maker crée maintenant ton site internet » — 1080×1920, 60 i/s, sans voix off.
// Un seul objet suit toute la vidéo (navigateur → téléphone) et la caméra se déplace autour :
// pas de coupe sèche, chaque scène se fond dans la suivante.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useVideoConfig } from "remotion";
import { Background, Check, Pill, Sparkle, StarRow, Title, springAt, useT } from "./components";
import { DesktopSite, MobileSite } from "./Site";
import { C, EASE, FPS, H, W, fontFamily, shadow, tw } from "./theme";

export const DURATION = 26;

const Sfx: React.FC<{ name: string; at: number; volume?: number }> = ({ name, at, volume = 0.6 }) => (
  <Sequence from={Math.round(at * FPS)} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

const SOUNDS: [string, number, number?][] = [
  ["pop", 0.1, 0.5],
  ["whoosh-soft", 0.15, 0.35],
  ["whoosh", 1.9, 0.45],
  ["whoosh", 3.45, 0.55],
  ["tick", 4.35, 0.35],
  ["tick", 4.5, 0.35],
  ["tick", 4.65, 0.35],
  ["tick", 4.8, 0.35],
  ["tick", 4.95, 0.35],
  ["shimmer", 5.8, 0.3],
  ["whoosh-soft", 7.55, 0.4],
  ["ding", 7.95, 0.45],
  ["whoosh-soft", 9.6, 0.35],
  ["click", 10.9, 0.6],
  ["whoosh", 11.95, 0.5],
  ["pop", 14.2, 0.4],
  ["whoosh-soft", 15.75, 0.4],
  ["pop", 16.4, 0.45],
  ["pop", 16.8, 0.45],
  ["pop", 17.2, 0.45],
  ["riser", 18.45, 0.5],
  ["boom", 20.25, 0.7],
  ["shimmer", 21.0, 0.35],
  ["pop", 22.6, 0.5],
  ["tick", 23.0, 0.4],
];

const DESK = { x: 40, y: 640, w: 1000, h: 724 };
const PHONE = { x: 290, y: 570, w: 500, h: 1020 };
// points clés du site (en coordonnées écran, version ordinateur)
const K = DESK.w / 940;
const BTN = { x: DESK.x + 837 * K, y: DESK.y + 64 + 39 * K };
const REVIEWS = { x: DESK.x + 216 * K, y: DESK.y + 64 + 427 * K };
const TOOLBAR = 64;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

const URL = "ton-commerce.fr";

const Device: React.FC = () => {
  const t = useT();
  const { fps } = useVideoConfig();

  const enter = springAt(t, 3.45, fps, { damping: 20, stiffness: 90, mass: 1 });
  const m = tw(t, [12.0, 13.3], [0, 1], EASE.inOut); // ordinateur → téléphone
  const shrink = tw(t, [15.8, 16.7], [0, 1], EASE.inOut);

  const x = lerp(DESK.x, PHONE.x, m);
  const y = lerp(DESK.y, PHONE.y, m);
  const w = lerp(DESK.w, PHONE.w, m);
  const h = lerp(DESK.h, PHONE.h, m);
  const bezel = 12 * m;
  const radius = lerp(26, 64, m);
  const bar = TOOLBAR * (1 - m);
  const innerW = w - bezel * 2;
  const innerH = h - bezel * 2 - bar;

  const chars = Math.floor(tw(t, [4.3, 5.1], [0, URL.length], (v) => v));
  const scroll = tw(t, [13.6, 15.4], [0, 250], EASE.inOut) + tw(t, [16.8, 19.8], [0, 120], EASE.inOut);
  const deskO = 1 - tw(m, [0.15, 0.55], [0, 1], (v) => v);
  const mobO = tw(m, [0.45, 0.85], [0, 1], (v) => v);

  const s = 1 - 0.16 * shrink;
  const cx = x + w / 2;
  const cy = y + h / 2;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transformOrigin: "50% 50%",
        transform: `perspective(2200px) translateY(${(1 - enter) * 1100 - shrink * 30}px) rotateX(${(1 - enter) * 28}deg) scale(${(0.9 + enter * 0.1) * s})`,
        borderRadius: radius,
        background: m > 0.02 ? C.navy : C.white,
        boxShadow: shadow.device,
        overflow: "hidden",
      }}
      data-cx={cx}
      data-cy={cy}
    >
      {/* barre du navigateur */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bar, background: "#EEF2F9", opacity: 1 - m * 1.5, display: "flex", alignItems: "center", padding: "0 22px", gap: 10 }}>
        {["#FF6159", "#FFBD2E", "#28C941"].map((c) => (
          <div key={c} style={{ width: 13, height: 13, borderRadius: "50%", background: c }} />
        ))}
        <div style={{ marginLeft: 22, flex: 1, height: 38, borderRadius: 19, background: C.white, display: "flex", alignItems: "center", padding: "0 18px", gap: 10, fontFamily, fontSize: 17, color: C.navy, fontWeight: 500 }}>
          <svg width="15" height="15" viewBox="0 0 24 24">
            <path d="M6 10V8a6 6 0 1 1 12 0v2h1v12H5V10h1zm2 0h8V8a4 4 0 1 0-8 0v2z" fill={C.grey} />
          </svg>
          <span>
            {URL.slice(0, chars)}
            <span style={{ opacity: t < 5.6 && Math.floor(t * 2.5) % 2 === 0 ? 1 : 0, color: C.blue }}>|</span>
          </span>
        </div>
      </div>
      {/* écran */}
      <div style={{ position: "absolute", left: bezel, top: bezel + bar, width: innerW, height: innerH, borderRadius: Math.max(0, radius - bezel), overflow: "hidden", background: C.white }}>
        {deskO > 0 && (
          <div style={{ position: "absolute", left: 0, top: 0, width: 940, height: 636, transformOrigin: "0 0", transform: `scale(${innerW / 940})`, opacity: deskO, filter: `blur(${(1 - deskO) * 6}px)` }}>
            <DesktopSite skel={4.4} fill={5.8} starsAt={7.9} />
          </div>
        )}
        {mobO > 0 && (
          <div style={{ position: "absolute", left: 0, top: 0, width: 416, height: 876, transformOrigin: "0 0", transform: `scale(${innerW / 416})`, opacity: mobO, filter: `blur(${(1 - mobO) * 6}px)` }}>
            <MobileSite scroll={scroll} starsAt={14.15} />
          </div>
        )}
        {/* Dynamic Island */}
        <div style={{ position: "absolute", top: 14, left: "50%", width: 120, height: 34, marginLeft: -60, borderRadius: 17, background: C.navy, opacity: mobO, transform: `scale(${0.6 + mobO * 0.4})` }} />
      </div>
    </div>
  );
};

const Cursor: React.FC = () => {
  const t = useT();
  if (t < 9.9 || t > 12.2) return null;
  const p = tw(t, [10.0, 10.85], [0, 1], EASE.inOut);
  const x = lerp(760, BTN.x, p) + Math.sin(p * Math.PI) * 120;
  const y = lerp(1420, BTN.y, p);
  const click = tw(t, [10.85, 10.95], [0, 1]) - tw(t, [10.95, 11.15], [0, 1]);
  const ripple = tw(t, [10.9, 11.6], [0, 1]);
  const o = tw(t, [9.9, 10.1], [0, 1]) * (1 - tw(t, [11.7, 12.0], [0, 1]));
  return (
    <>
      <div style={{ position: "absolute", left: BTN.x - 60, top: BTN.y - 60, width: 120, height: 120, borderRadius: "50%", border: `4px solid ${C.blue}`, opacity: ripple > 0 ? (1 - ripple) * 0.8 : 0, transform: `scale(${0.2 + ripple})` }} />
      <svg width="54" height="54" viewBox="0 0 24 24" style={{ position: "absolute", left: x - 8, top: y - 4, opacity: o, transform: `scale(${1 - click * 0.18})`, filter: "drop-shadow(0 6px 10px rgba(14,26,58,0.3))" }}>
        <path d="M4 2l15 9.5-6.6 1.3 3.9 7.4-2.9 1.5-3.9-7.4L4 19z" fill={C.navy} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </>
  );
};

const Feature: React.FC<{ x: number; y: number; at: number; label: string; stars?: boolean; k: number }> = ({ x, y, at, label, stars, k }) => {
  const t = useT();
  const { fps } = useVideoConfig();
  const p = springAt(t, at, fps, { damping: 14, stiffness: 130, mass: 0.8 });
  const out = tw(t, [19.85, 20.25], [0, 1], EASE.in);
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + Math.sin(t * 1.6 + k) * 8,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "22px 30px 22px 22px",
        borderRadius: 26,
        background: "rgba(255,255,255,0.96)",
        boxShadow: shadow.card,
        fontFamily,
        fontWeight: 700,
        fontSize: 32,
        color: C.navy,
        whiteSpace: "nowrap",
        opacity: Math.min(1, p * 1.4) * (1 - out),
        transform: `translateY(${(1 - p) * 60}px) scale(${0.7 + p * 0.3 - out * 0.2})`,
        filter: `blur(${(1 - Math.min(1, p)) * 6 + out * 8}px)`,
      }}
    >
      <Check size={50} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {label}
        {stars && <StarRow size={26} at={at + 0.25} gap={4} />}
      </div>
    </div>
  );
};

// Fin : rond bleu puis révélation claire du logo + appel à l'action
const EndCard: React.FC = () => {
  const t = useT();
  const { fps } = useVideoConfig();
  const blue = tw(t, [20.05, 20.7], [0, 2300], EASE.inOut);
  const light = tw(t, [20.55, 21.25], [0, 2300], EASE.inOut);
  if (t < 20.0) return null;
  const rMark = springAt(t, 20.3, fps, { damping: 13, stiffness: 140, mass: 0.8 });
  const logo = springAt(t, 20.95, fps, { damping: 18, stiffness: 110, mass: 1 });
  const cta = springAt(t, 22.55, fps, { damping: 12, stiffness: 150, mass: 0.8 });
  const bio = springAt(t, 22.95, fps, { damping: 14, stiffness: 150, mass: 0.8 });
  const sheen = tw(t, [21.7, 22.5], [-40, 140], EASE.inOut);
  const ctaSheen = ((t - 23) % 2.2) / 2.2;
  return (
    <>
      <AbsoluteFill style={{ clipPath: `circle(${blue}px at 540px 1080px)`, background: `radial-gradient(circle at 50% 55%, ${C.blueLight}, ${C.blue} 45%, #2E4D8F)` }}>
        <div style={{ position: "absolute", left: 540 - 190, top: 1080 - 190, width: 380, height: 380, borderRadius: "50%", background: C.white, boxShadow: "0 40px 80px -20px rgba(14,26,58,0.45)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${rMark}) rotate(${(1 - rMark) * -25}deg)` }}>
          <Img src={staticFile("brand/logo-r.png")} style={{ width: 230 }} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `circle(${light}px at 540px 1080px)` }}>
        <Background />
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 560,
            width: 820,
            opacity: Math.min(1, logo * 1.3),
            transform: `translateY(${(1 - logo) * 60}px) scale(${0.86 + logo * 0.14})`,
            filter: `blur(${(1 - Math.min(1, logo)) * 10}px)`,
            WebkitMaskImage: `linear-gradient(100deg, #000 ${sheen - 20}%, rgba(0,0,0,0.55) ${sheen}%, #000 ${sheen + 20}%)`,
          }}
        >
          <Img src={staticFile("brand/logo-full.png")} style={{ width: "100%" }} />
        </div>
        <Sparkle x={210} y={520} at={21.3} size={38} />
        <Sparkle x={880} y={590} at={21.5} size={28} />
        <Sparkle x={840} y={860} at={21.75} size={34} />
        <Title lines={["Tes avis. Ton site.", [{ w: "Une seule " }, { w: "équipe.", accent: true }]]} at={21.55} top={920} size={74} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1200, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
          <div style={{ transform: `scale(${cta})`, opacity: Math.min(1, cta * 1.5) }}>
            <Pill dark style={{ fontSize: 40, padding: "26px 56px", position: "relative", overflow: "hidden", boxShadow: "0 24px 50px -16px rgba(65,102,176,0.6)" }}>
              Demande ton site
              <div style={{ position: "absolute", top: 0, bottom: 0, width: 90, left: `${ctaSheen * 160 - 30}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)", transform: "skewX(-20deg)" }} />
            </Pill>
          </div>
          <div style={{ transform: `scale(${bio})`, opacity: Math.min(1, bio * 1.5), display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Pill style={{ fontSize: 28, padding: "12px 30px" }}>Lien en bio</Pill>
            <svg width="40" height="40" viewBox="0 0 24 24" style={{ transform: `translateY(${Math.sin(t * 5) * 6}px)` }}>
              <path d="M12 4v15m0 0l-6-6m6 6l6-6" stroke={C.blue} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
};

export const SitesWeb: React.FC = () => {
  const t = useT();
  const { fps } = useVideoConfig();

  // caméra : léger travelling, zoom sur les avis, puis plongée dans le téléphone
  const push = tw(t, [3.6, 7.5], [0, 0.05], EASE.inOut) * (1 - tw(t, [7.5, 8.4], [0, 1], EASE.inOut));
  const z = tw(t, [7.55, 8.45], [0, 1], EASE.inOut) - tw(t, [9.6, 10.4], [0, 1], EASE.inOut);
  const e = tw(t, [19.9, 20.6], [0, 1], EASE.in);
  const focus = REVIEWS;
  const camS = 1 + push + 0.55 * z + 2.6 * e;
  const fx = lerp(540, focus.x, z);
  const fy = lerp(1080, focus.y, z);
  const tx = lerp(540, 640, z);
  const ty = lerp(1080, 1250, z);

  const pill = springAt(t, 0.08, fps, { damping: 14, stiffness: 150, mass: 0.7 });
  const pillOut = tw(t, [3.4, 3.8], [0, 1], EASE.inOut);

  return (
    <AbsoluteFill style={{ fontFamily, width: W, height: H }}>
      <Background />

      {/* Accroche */}
      <div style={{ position: "absolute", top: 600, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(1, pill * 1.4) * (1 - pillOut), transform: `scale(${pill}) translateY(${-pillOut * 30}px)`, filter: `blur(${pillOut * 8}px)` }}>
        <Pill dark style={{ fontSize: 30 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.star }} />
          Nouveau chez Review Maker
        </Pill>
      </div>
      <Title lines={["Tu nous connais", ["pour tes ", { w: "avis Google.", accent: true }].map((p) => (typeof p === "string" ? { w: p } : p))]} at={0.15} out={1.75} top={720} size={84} />
      <Title lines={["Maintenant,", "on crée aussi", [{ w: "ton site internet.", accent: true }]]} at={1.95} out={3.35} top={700} size={90} stagger={0.07} />

      {/* Monde filmé par la caméra */}
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${tx - fx * camS}px, ${ty - fy * camS}px) scale(${camS})` }}>
        {t > 3.3 && <Device />}
        <Cursor />
        <Feature x={40} y={740} at={16.4} label="Design sur-mesure" k={0} />
        <Feature x={570} y={1030} at={16.8} label="Adapté au mobile" k={1.7} />
        <Feature x={50} y={1300} at={17.2} label="Tes avis en avant" stars k={3.1} />
      </AbsoluteFill>

      {/* Titres des scènes (hors caméra, toujours lisibles) */}
      <Title lines={[[{ w: "Un site " }, { w: "pro,", accent: true }], "à ton image."]} at={3.85} out={7.3} />
      <Title lines={[[{ w: "Tes " }, { w: "avis Google", accent: true }], "mis en avant."]} at={7.55} out={11.45} />
      <Title lines={["Parfait sur", [{ w: "mobile.", accent: true }]]} at={11.65} out={15.55} />
      <Title lines={["Tout pour", [{ w: "attirer " }, { w: "des clients.", accent: true }]]} at={15.85} out={19.75} />

      <EndCard />

      {SOUNDS.map(([n, at, v], i) => (
        <Sfx key={i} name={n} at={at} volume={v} />
      ))}
    </AbsoluteFill>
  );
};
