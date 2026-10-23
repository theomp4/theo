import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BEAT,
  D,
  E,
  Flash,
  GoogleG,
  MaskUp,
  MotionBlur,
  Night,
  POP,
  Photo,
  Rays,
  Roller,
  Shockwave,
  Slam,
  Sparkle,
  TimeCtx,
  b,
  gradText,
  shake,
  tw,
  useT,
} from "./core";
import { Browser, Phone } from "./devices";
import { DEMO, SiteDesktop, SiteId, SiteMobile, THEMES } from "./sites";

const H1: React.CSSProperties = { fontFamily: POP, fontWeight: 800, color: D.white, letterSpacing: -2.5, lineHeight: 1.02, textAlign: "center", whiteSpace: "nowrap" };

// ============================================================ 0 · « Ton site ressemble encore à ça ? »

const OldSite: React.FC = () => {
  const t = useT();
  return (
    <div style={{ width: 920, height: 980, background: "#D4D0C8", border: "3px outset #fff", fontFamily: "'Times New Roman', 'Liberation Serif', 'DejaVu Serif', serif", position: "relative", overflow: "hidden" }}>
      <div style={{ height: 38, background: "linear-gradient(90deg,#0A246A,#A6CAF0)", color: "#fff", fontFamily: "Tahoma, 'DejaVu Sans', sans-serif", fontWeight: 700, fontSize: 17, display: "flex", alignItems: "center", padding: "0 10px", justifyContent: "space-between" }}>
        <span>Boulangerie Martin - Accueil - Internet Explorer</span>
        <span style={{ display: "flex", gap: 4 }}>
          {["_", "□", "×"].map((c) => (
            <span key={c} style={{ width: 24, height: 22, background: "#D4D0C8", color: "#000", border: "2px outset #fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
              {c}
            </span>
          ))}
        </span>
      </div>
      <div style={{ height: 30, fontFamily: "Tahoma, 'DejaVu Sans', sans-serif", fontSize: 15, display: "flex", gap: 18, alignItems: "center", padding: "0 10px", borderBottom: "1px solid #888" }}>
        <span>Fichier</span>
        <span>Edition</span>
        <span>Affichage</span>
        <span>Favoris</span>
        <span>Outils</span>
      </div>
      <div style={{ height: 34, fontFamily: "Tahoma, 'DejaVu Sans', sans-serif", fontSize: 15, display: "flex", alignItems: "center", gap: 8, padding: "0 10px" }}>
        Adresse
        <div style={{ flex: 1, height: 24, background: "#fff", border: "2px inset #888", padding: "0 6px", display: "flex", alignItems: "center" }}>http://www.boulangerie-martin.free.fr/index.htm</div>
      </div>
      <div style={{ position: "absolute", top: 102, left: 0, right: 0, bottom: 0, background: "#FFFFCC", backgroundImage: "radial-gradient(#F2E6A0 2px, transparent 2px)", backgroundSize: "18px 18px", padding: 22 }}>
        <div style={{ color: "#CC0000", fontSize: 42, fontWeight: 700, textAlign: "center", textDecoration: "underline", fontStyle: "italic" }}>Bienvenue sur le site de la Boulangerie Martin !!!</div>
        <div style={{ overflow: "hidden", whiteSpace: "nowrap", marginTop: 16, background: "#000080", color: "#FFFF00", fontSize: 22, padding: "4px 0" }}>
          <span style={{ display: "inline-block", transform: `translateX(${900 - ((t * 320) % 1700)}px)` }}>*** NOUVEAU : nos croissants sont arrivés !!! *** Commandez par téléphone ***</span>
        </div>
        <table style={{ marginTop: 18, width: "100%", borderCollapse: "separate", border: "3px outset #999", background: "#fff" }}>
          <tbody>
            <tr>
              <td style={{ width: 220, verticalAlign: "top", borderRight: "2px solid #999", padding: 12, fontSize: 22, lineHeight: 1.9 }}>
                {["Accueil", "Nos produits", "Les horaires", "Contact", "Livre d'or"].map((l) => (
                  <div key={l} style={{ color: "#0000EE", textDecoration: "underline" }}>
                    » {l}
                  </div>
                ))}
              </td>
              <td style={{ padding: 14, fontSize: 21, lineHeight: 1.45, color: "#333" }}>
                <div style={{ width: 300, height: 180, border: "2px solid #999", background: "#EEE", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontFamily: "Tahoma, 'DejaVu Sans', sans-serif", fontSize: 16, gap: 8 }}>
                  <span style={{ width: 22, height: 22, border: "1px solid #999", color: "#C00", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>×</span>
                  photo_boutique.jpg
                </div>
                <p style={{ margin: "14px 0 0" }}>Bonjour et bienvenue ! Nous sommes une boulangerie familiale. Cliquez sur les liens a gauche pour visiter notre site.</p>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 22, height: 40, background: "repeating-linear-gradient(45deg,#000 0 22px,#FFD800 22px 44px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ background: "#FFD800", padding: "2px 14px", fontWeight: 700, fontSize: 22, fontFamily: "Tahoma, 'DejaVu Sans', sans-serif" }}>SITE EN CONSTRUCTION</span>
        </div>
        <div style={{ marginTop: 22, textAlign: "center", fontSize: 21 }}>
          Vous êtes le{" "}
          {"000127".split("").map((d, i) => (
            <span key={i} style={{ display: "inline-block", background: "#000", color: "#0F0", fontFamily: "monospace", padding: "0 5px", margin: "0 1px" }}>
              {d}
            </span>
          ))}{" "}
          ème visiteur
        </div>
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 16, color: "#666" }}>Site optimisé pour Internet Explorer 6 en 800x600 · Mis à jour le 12/03/2009</div>
      </div>
    </div>
  );
};

const glitchAmount = (t: number) => {
  const pulse = (at: number, d: number) => (t >= at && t < at + d ? 1 : 0);
  return Math.max(pulse(b(2), 0.12), pulse(b(2.75), 0.08), t >= b(3) && t < b(3.45) ? 0.5 + (t - b(3)) * 2.2 : 0);
};

export const Intro: React.FC = () => {
  const t = useT();
  if (t > b(4)) return null;
  const enter = tw(t, [0, 0.28], [0, 1], E.snap);
  const g = glitchAmount(t);
  const off = tw(t, [b(3.45), b(3.62)], [0, 1], E.in);
  const offX = tw(t, [b(3.62), b(3.8)], [0, 1], E.in);
  const sh = shake(t, 0, 14, 0.3);
  const slices = 7;
  const seed = Math.floor(t * 60);
  const rnd = (i: number) => Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453 % 1;
  const win = (i: number | null) => {
    const sx = i === null ? 0 : g * rnd(i) * 120;
    return (
      <div
        key={i ?? "main"}
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${sx}px)`,
          clipPath: i === null ? undefined : `inset(${(i / slices) * 100}% 0 ${100 - ((i + 1) / slices) * 100}% 0)`,
        }}
      >
        <OldSite />
      </div>
    );
  };
  const titleOut = tw(t, [b(3.3), b(3.6)], [0, 1], E.in);
  const tj = g > 0 ? rnd(99) * 16 * g : 0;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 200, left: 0, right: 0, transform: `translate(${tj}px, ${-titleOut * 40}px)`, opacity: 1 - titleOut, filter: `blur(${titleOut * 12}px)` }}>
        <MaskUp at={0.02} style={{ ...H1, fontSize: 96 }}>
          Ton site ressemble
        </MaskUp>
        <MaskUp at={b(1)} style={{ ...H1, fontSize: 96 }}>
          encore <span style={gradText(t)}>à ça ?</span>
        </MaskUp>
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 640,
          width: 920,
          height: 980,
          transform: `translate(${sh.x}px, ${sh.y}px) scale(${(1.15 - 0.15 * enter) * (1 - offX)}, ${(1.15 - 0.15 * enter) * (1 - off * 0.996)}) rotate(${sh.r}deg)`,
          opacity: enter,
          filter: `${g > 0 ? `hue-rotate(${rnd(5) * 180}deg) saturate(${1 + g * 2}) contrast(${1 + g * 0.6})` : ""} brightness(${1 + off * 3})`,
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        {g > 0 ? Array.from({ length: slices }).map((_, i) => win(i)) : win(null)}
        {g > 0 && (
          <>
            <div style={{ position: "absolute", inset: 0, transform: `translateX(${-14 * g}px)`, background: "rgba(255,0,60,0.18)", mixBlendMode: "screen" }} />
            <div style={{ position: "absolute", inset: 0, transform: `translateX(${14 * g}px)`, background: "rgba(0,220,255,0.15)", mixBlendMode: "screen" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 2px, transparent 2px 5px)" }} />
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================ 1 · DROP « Un site qui fait la différence. »

export const Drop: React.FC = () => {
  const t = useT();
  if (t < b(4) || t > b(8.05)) return null;
  const out = tw(t, [b(7.4), b(8)], [0, 1], E.in);
  const s1 = shake(t, b(4), 10);
  const s2 = shake(t, b(5), 6);
  const s3 = shake(t, b(6), 10);
  const sx = s1.x + s2.x + s3.x;
  const sy = s1.y + s2.y + s3.y;
  const breathe = 1 + tw(t, [b(6), b(7.4)], [0, 0.04], E.inOut);
  return (
    <AbsoluteFill>
      <Rays at={b(6)} until={b(7.8)} y={1110} color="rgba(91,134,229,0.3)" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          transform: `translate(${sx}px, ${sy}px) scale(${breathe * (1 + out * 3)})`,
          filter: `blur(${out * 24}px)`,
          opacity: 1 - out,
        }}
      >
        <Slam at={b(4)} from={1.35} style={{ ...H1, fontSize: 170, fontWeight: 800 }}>
          Un site
        </Slam>
        <Slam at={b(5)} from={1.35} style={{ ...H1, fontSize: 130, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
          qui fait
        </Slam>
        <Slam at={b(6)} from={1.5} style={{ ...H1, fontSize: 116, fontWeight: 800, ...gradText(t) }}>
          la différence.
        </Slam>
      </div>
      <Shockwave at={b(4)} />
      
    </AbsoluteFill>
  );
};

// ============================================================ 2 · Vitrine des sites

const SHOW: { id: SiteId; label: string; url: string; tint: string }[] = [
  { id: "resto", label: "ton restaurant.", url: "maison-lumiere.fr", tint: "#B88A3A" },
  { id: "salon", label: "ton salon.", url: "atelier-rose.fr", tint: "#C0606E" },
  { id: "garage", label: "ton garage.", url: "delta-auto.fr", tint: "#E0541D" },
  { id: "fournil", label: "ta boulangerie.", url: "le-fournil.fr", tint: "#B07A3E" },
];

export const Showcase: React.FC = () => {
  const t = useT();
  if (t < b(7.9) || t > b(24.1)) return null;
  const headOut = tw(t, [b(23.3), b(23.9)], [0, 1], E.in);
  return (
    <AbsoluteFill>
      {SHOW.map((s, i) => {
        const st = b(8 + i * 4);
        const en = b(12 + i * 4);
        const glow = tw(t, [st - 0.2, st + 0.4], [0, 1]) * (1 - tw(t, [en - 0.4, en + 0.1], [0, 1]));
        return <div key={s.id} style={{ position: "absolute", left: 540 - 650, top: 1050 - 650, width: 1300, height: 1300, borderRadius: "50%", background: `radial-gradient(circle, ${s.tint} 0%, transparent 62%)`, opacity: glow * 0.5 }} />;
      })}
      <div style={{ position: "absolute", top: 190, left: 0, right: 0, opacity: 1 - headOut, transform: `translateY(${-headOut * 50}px)`, filter: `blur(${headOut * 10}px)` }}>
        <MaskUp at={b(8)} style={{ ...H1, fontSize: 78, fontWeight: 700 }}>
          Un site pour
        </MaskUp>
        <Roller height={128} items={SHOW.map((s, i) => ({ at: b(8 + i * 4), node: <div style={{ ...H1, fontSize: 112, ...gradText(t) }}>{s.label}</div> }))} />
      </div>
      {SHOW.map((s, i) => {
        const st = b(8 + i * 4);
        const en = b(12 + i * 4);
        if (t < st - 0.06 || t > en + 0.06) return null;
        const pin = tw(t, [st - 0.05, st + 0.55], [0, 1], E.expo);
        const pout = tw(t, [en - 0.36, en + 0.05], [0, 1], E.in);
        const dir = i % 2 ? -1 : 1;
        const x = ((1 - pin) * 760 - pout * 760) * dir;
        const local = tw(t, [st, en], [0, 1], (v) => v);
        const u = t - st;
        const scroll = tw(u, DEMO.scroll, [0, 270], E.inOut);
        const ppin = tw(t, [st + 0.08, st + 0.65], [0, 1], E.expo);
        const px = ((1 - ppin) * 900 - pout * 900) * dir;
        const op = Math.min(pin * 1.4, 1) * (1 - pout);
        return (
          <React.Fragment key={s.id}>
            <MotionBlur bx={(1 - pin) * 40 + pout * 40} style={{ opacity: op }}>
              <div style={{ position: "absolute", left: 50, top: 600, transform: `translateX(${x}px) perspective(2400px) rotateY(${-10 + local * 7}deg) rotateX(4deg) scale(${(0.9 + pin * 0.1) * (1.02 - local * 0.03)})` }}>
                <Browser w={980} url={s.url} glow={`${s.tint}88`}>
                  <SiteDesktop id={s.id} scroll={scroll} t0={st + 0.05} demo />
                </Browser>
              </div>
            </MotionBlur>
            <MotionBlur bx={(1 - ppin) * 40 + pout * 40} style={{ opacity: Math.min(ppin * 1.4, 1) * (1 - pout) }}>
              <div style={{ position: "absolute", left: s.id === "fournil" ? 770 : 40, top: 1110, transform: `translateX(${px}px) translateY(${(1 - local) * 30}px) perspective(1800px) rotateY(${(s.id === "fournil" ? -10 : 10) + local * (s.id === "fournil" ? 6 : -6)}deg)` }}>
                <Phone w={270} h={560} glow={`${s.tint}99`}>
                  <SiteMobile id={s.id} scroll={scroll * 0.9} t0={st + 0.25} />
                </Phone>
              </div>
            </MotionBlur>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ============================================================ 3 · Mur de sites

const WALL: SiteId[] = ["resto", "fleurs", "garage", "salon", "fournil"];

export const Wall: React.FC = () => {
  const t = useT();
  if (t < b(23.95) || t > b(28.05)) return null;
  const pin = tw(t, [b(24), b(24.7)], [0, 1], E.expo);
  const pout = tw(t, [b(27.4), b(28)], [0, 1], E.in);
  const scale = (2.3 - 1.3 * pin) * (1 - 0.06 * tw(t, [b(24.7), b(27.4)], [0, 1], E.inOut)) * (1 + pout * 2.5);
  const k = t - b(24);
  return (
    <AbsoluteFill style={{ opacity: 1 - tw(t, [b(27.75), b(28)], [0, 1]) }}>
      <div style={{ position: "absolute", left: 540, top: 960, transform: `scale(${scale})`, filter: `blur(${(1 - pin) * 14 + pout * 18}px)` }}>
        <div style={{ position: "absolute", left: 0, top: 0, transform: "perspective(2000px) rotateX(50deg) rotateZ(-30deg)", transformStyle: "preserve-3d" }}>
          {Array.from({ length: 5 }).map((_, c) => (
            <div key={c} style={{ position: "absolute", left: (c - 2) * 560 - 260, top: -1300 + (c % 2 ? -1 : 1) * k * 150 }}>
              {Array.from({ length: 7 }).map((__, r) => {
                const id = WALL[(c * 2 + r) % WALL.length];
                const lit = Math.max(0, Math.sin(t * 3 + c * 1.3 + r * 0.9));
                return (
                  <div key={r} style={{ position: "absolute", left: 0, top: r * 370 }}>
                    <Browser w={520} url={THEMES[id].name.toLowerCase().replace(/[^a-z]+/g, "-") + ".fr"} glow={`rgba(91,134,229,${0.15 + lit * 0.35})`} radius={14}>
                      <SiteDesktop id={id} scroll={((r * 137 + c * 61) % 3) * 120} />
                    </Browser>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 32% at 50% 50%, rgba(4,6,14,0.88) 0%, rgba(4,6,14,0.5) 55%, transparent 100%)", opacity: 1 - pout }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - pout, transform: `scale(${1 + pout * 0.4})` }}>
        <Slam at={b(24.25)} style={{ ...H1, fontSize: 170, fontWeight: 900 }}>
          Design
        </Slam>
        <Slam at={b(25)} from={1.9} style={{ ...H1, fontSize: 150, fontWeight: 900, ...gradText(t) }}>
          sur-mesure.
        </Slam>
        <div style={{ display: "flex", gap: 18, marginTop: 40 }}>
          {["Moderne", "Unique", "À ton image"].map((c, i) => {
            const p = tw(t, [b(26 + i * 0.5), b(26 + i * 0.5) + 0.3], [0, 1], E.back);
            return (
              <div
                key={c}
                style={{
                  fontFamily: POP,
                  fontWeight: 600,
                  fontSize: 34,
                  color: "#fff",
                  padding: "16px 30px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(12px)",
                  transform: `scale(${p})`,
                  opacity: Math.min(1, p * 2),
                }}
              >
                {c}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================ 4 · Responsive (avec tape stop)

const lerp = (a: number, c: number, p: number) => a + (c - a) * p;

const ResponsiveInner: React.FC = () => {
  const t = useT();
  const pin = tw(t, [b(28), b(28.5)], [0, 1], E.expo);
  const m1 = tw(t, [b(29) - 0.1, b(29) + 0.16], [0, 1], E.back);
  const m2 = tw(t, [b(30) - 0.1, b(30) + 0.16], [0, 1], E.back);
  const w = lerp(lerp(960, 640, m1), 400, m2);
  const h = lerp(lerp(640, 880, m1), 830, m2);
  const radius = lerp(lerp(18, 42, m1), 64, m2);
  const bezel = Math.min(1, m1) * 14;
  const bar = 40 * (1 - Math.min(1, m1 * 1.4));
  const spin = tw(t, [b(30.9), b(31.4)], [0, 360], E.inOut);
  const spinV = Math.sin((spin / 360) * Math.PI);
  const scroll = tw(t, [b(30.2), b(31.3)], [0, 380], E.inOut);
  const iw = w - bezel * 2;
  const ih = h - bezel * 2 - bar;
  const dO = 1 - tw(m1, [0, 0.5], [0, 1], (v) => v);
  const tO = tw(m1, [0.4, 0.9], [0, 1], (v) => v) * (1 - tw(m2, [0, 0.5], [0, 1], (v) => v));
  const pO = tw(m2, [0.4, 0.9], [0, 1], (v) => v);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 190, left: 0, right: 0 }}>
        <MaskUp at={b(28)} style={{ ...H1, fontSize: 78, fontWeight: 700 }}>
          Parfait
        </MaskUp>
        <Roller
          height={128}
          items={[
            { at: b(28), node: <div style={{ ...H1, fontSize: 112, ...gradText(t) }}>sur ordi.</div> },
            { at: b(29), node: <div style={{ ...H1, fontSize: 112, ...gradText(t) }}>sur tablette.</div> },
            { at: b(30), node: <div style={{ ...H1, fontSize: 112, ...gradText(t) }}>sur mobile.</div> },
          ]}
        />
      </div>
      <MotionBlur bx={spinV * 30}>
        <div
          style={{
            position: "absolute",
            left: 540 - w / 2,
            top: 1060 - h / 2,
            width: w,
            height: h,
            borderRadius: radius,
            background: m1 > 0.02 ? "linear-gradient(145deg,#2A2F3A,#0B0D12)" : "#141821",
            boxShadow: `0 60px 120px -30px rgba(0,0,0,0.85), 0 0 120px -10px rgba(242,185,160,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.16)`,
            overflow: "hidden",
            transform: `scale(${2.4 - 1.4 * pin}) perspective(2000px) rotateY(${spin}deg)`,
            filter: `blur(${(1 - pin) * 16}px)`,
          }}
        >
          <div style={{ height: bar, display: "flex", alignItems: "center", gap: 8, padding: "0 18px", background: "linear-gradient(180deg,#1C2130,#151925)", opacity: 1 - m1 }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
              <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: bezel, top: bezel + bar, width: iw, height: ih, borderRadius: Math.max(0, radius - bezel), overflow: "hidden", background: THEMES.fleurs.bg }}>
            {dO > 0 && (
              <div style={{ position: "absolute", left: 0, top: 0, width: 1280, height: 800, transformOrigin: "0 0", transform: `scale(${iw / 1280})`, opacity: dO }}>
                <SiteDesktop id="fleurs" t0={b(28) + 0.1} />
              </div>
            )}
            {tO > 0 && (
              <div style={{ position: "absolute", left: 0, top: 0, width: 600, height: 1400, transformOrigin: "0 0", transform: `scale(${iw / 600})`, opacity: tO }}>
                <SiteMobile id="fleurs" width={600} t0={b(29) - 0.1} />
              </div>
            )}
            {pO > 0 && (
              <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: 1400, transformOrigin: "0 0", transform: `scale(${iw / 390})`, opacity: pO }}>
                <SiteMobile id="fleurs" scroll={scroll} t0={b(30) - 0.1} />
              </div>
            )}
            {m2 > 0.5 && <div style={{ position: "absolute", top: 12, left: "50%", width: 110, height: 32, marginLeft: -55, borderRadius: 16, background: "#000" }} />}
          </div>
        </div>
      </MotionBlur>
    </AbsoluteFill>
  );
};

export const Responsive: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const real = f / fps;
  if (real < b(27.9) || real > b(32.02)) return null;
  // tape stop : le temps ralentit jusqu'à s'arrêter entre b23.4 et b24
  const a = b(31.4);
  const z = b(32);
  let warped = real;
  if (real > a) {
    const p = Math.min(1, (real - a) / (z - a));
    warped = a + (z - a) * (p - p * p / 2) * 0.9;
  }
  const stop = tw(real, [a, z], [0, 1], (v) => v);
  return (
    <TimeCtx.Provider value={warped}>
      <AbsoluteFill style={{ filter: `grayscale(${stop}) brightness(${1 - stop * 0.65})`, transform: `scale(${1 - stop * 0.08}) rotate(${stop * -2}deg)`, opacity: tw(real, [b(27.9), b(28.05)], [0, 1]) }}>
        <ResponsiveInner />
      </AbsoluteFill>
    </TimeCtx.Provider>
  );
};

// ============================================================ 5 · Google

const QUERY = "fleuriste près de moi";
const SLOT0 = 790;
const SLOT_H = 150;

const ResultCard: React.FC<{ hero?: boolean; glow?: number; w?: number }> = ({ hero, glow = 0 }) => (
  <div
    style={{
      width: 920,
      height: 132,
      borderRadius: 28,
      background: hero ? "#fff" : "rgba(255,255,255,0.92)",
      display: "flex",
      alignItems: "center",
      gap: 22,
      padding: "0 26px",
      boxSizing: "border-box",
      fontFamily: "'DM Sans', sans-serif",
      border: hero ? `3px solid rgba(91,134,229,${glow})` : "1px solid rgba(255,255,255,0.4)",
      boxShadow: hero ? `0 0 ${70 * glow}px rgba(91,134,229,${0.8 * glow}), 0 30px 60px -20px rgba(0,0,0,0.6)` : "0 20px 40px -20px rgba(0,0,0,0.5)",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {hero ? (
      <>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: THEMES.fleurs.bg, color: THEMES.fleurs.accent, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>F</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, color: "#202124", fontWeight: 500 }}>
            Fleurs de Lune <span style={{ color: "#5F6368" }}>· fleursdelune.fr</span>
          </div>
          <div style={{ fontSize: 29, color: "#1A47B8", fontWeight: 700, whiteSpace: "nowrap", marginTop: 2 }}>Artisan fleuriste – Bouquets de saison</div>
          <div style={{ fontSize: 17, color: "#1E8E3E", fontWeight: 500, marginTop: 2 }}>Ouvert · Livraison le jour même</div>
        </div>
        <Photo src="flowers" style={{ width: 96, height: 96, borderRadius: 18, flexShrink: 0 }} />
      </>
    ) : (
      <>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: "#E2E6EE", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: 200, height: 14, borderRadius: 7, background: "#D9DEE8" }} />
          <div style={{ width: 460, height: 22, borderRadius: 11, background: "#C3CCDD", marginTop: 12 }} />
          <div style={{ width: 340, height: 13, borderRadius: 7, background: "#E2E6EE", marginTop: 12 }} />
        </div>
      </>
    )}
  </div>
);

export const GoogleScene: React.FC = () => {
  const t = useT();
  if (t < b(31.98) || t > b(39.8)) return null;
  const bar = tw(t, [b(32), b(32) + 0.2], [0, 1], E.snap);
  const typedStart = b(32.4);
  const chars = Math.max(0, Math.min(QUERY.length, Math.floor((t - typedStart) / 0.055) + 1));
  const up = tw(t, [b(36), b(36) + 0.5], [0, 1], E.back); // le site remonte en tête
  const glow = tw(t, [b(36), b(36) + 0.4], [0, 1]);
  const dim = tw(t, [b(37.5), b(38)], [0, 1]);
  const zoomIn = tw(t, [b(38), b(39.2)], [0, 1], E.inOut);
  const dive = tw(t, [b(39.15), b(39.75)], [0, 1], E.in);
  const camS = 1 + 0.32 * zoomIn + 5 * dive;
  const fx = 540;
  const fy = SLOT0 + 66;
  const sweep = tw(t, [b(36.1), b(36.1) + 0.55], [-30, 130], E.inOut);
  const head2 = b(34);
  const sb = shake(t, b(32), 7, 0.3);
  const sr = shake(t, b(36), 5, 0.3);
  const ripple = tw(t, [b(39), b(39) + 0.45], [0, 1]);
  const cursorP = tw(t, [b(38.3), b(39)], [0, 1], E.inOut);
  return (
    <AbsoluteFill style={{ opacity: 1 - tw(t, [b(39.55), b(39.75)], [0, 1]) }}>
      <div style={{ position: "absolute", top: 190, left: 0, right: 0, opacity: 1 - zoomIn, filter: `blur(${zoomIn * 10}px)` }}>
        <MaskUp at={b(32)} out={head2 - 0.2} style={{ ...H1, fontSize: 100 }}>
          Et surtout…
        </MaskUp>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <MaskUp at={head2} style={{ ...H1, fontSize: 84, fontWeight: 700 }}>
            Mis en avant
          </MaskUp>
          <MaskUp at={head2 + BEAT * 0.5} style={{ ...H1, fontSize: 116 }}>
            <span style={gradText(t)}>sur Google.</span>
          </MaskUp>
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${fx}px ${fy}px`, transform: `translate(${sb.x + sr.x}px, ${sb.y + sr.y}px) scale(${camS})`, filter: `blur(${dive * 20}px)` }}>
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 590,
            width: 940,
            height: 128,
            borderRadius: 64,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "0 40px",
            boxSizing: "border-box",
            boxShadow: "0 0 0 8px rgba(91,134,229,0.25), 0 0 80px rgba(91,134,229,0.5), 0 30px 60px -20px rgba(0,0,0,0.6)",
            transform: `scale(${1.5 - 0.5 * bar})`,
            filter: `blur(${(1 - bar) * 14}px)`,
            opacity: bar,
          }}
        >
          <GoogleG size={56} />
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 42, color: "#202124", fontWeight: 500, whiteSpace: "nowrap" }}>
            {t >= typedStart ? QUERY.slice(0, chars) : ""}
            <span style={{ color: D.blue, opacity: Math.floor(t * 4) % 2 ? 1 : 0 }}>|</span>
          </div>
        </div>
        {[0, 1, 2, 3, 4].map((i) => {
          const hero = i === 3;
          const appear = tw(t, [b(34 + i * 0.25), b(34 + i * 0.25) + 0.3], [0, 1], E.expo);
          let slot: number = i;
          if (hero) slot = 3 - 3 * up;
          else if (i < 3) slot = i + up;
          const y = SLOT0 + slot * SLOT_H;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 80,
                top: y,
                zIndex: hero ? 5 : 1,
                opacity: appear * (hero ? 1 : 1 - dim * 0.65),
                transform: `translateY(${(1 - appear) * 80}px) scale(${hero ? 1 + up * 0.05 + zoomIn * 0 : 1 - dim * 0.03})`,
                filter: `blur(${(1 - appear) * 8 + (hero ? 0 : dim * 3)}px)`,
              }}
            >
              <ResultCard hero={hero} glow={glow} />
              {hero && glow > 0 && (
                <div style={{ position: "absolute", inset: 0, borderRadius: 28, overflow: "hidden", pointerEvents: "none" }}>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sweep}%`, width: 140, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)", transform: "skewX(-20deg)", mixBlendMode: "overlay" }} />
                </div>
              )}
            </div>
          );
        })}
        <Sparkle x={110} y={SLOT0 - 10} at={b(36.3)} size={46} />
        <Sparkle x={990} y={SLOT0 + 20} at={b(36.5)} size={34} />
        <Sparkle x={960} y={SLOT0 + 150} at={b(36.8)} size={28} />
        {t > b(38.3) && (
          <>
            <div style={{ position: "absolute", left: 600 - 70, top: SLOT0 + 72 - 70, width: 140, height: 140, borderRadius: "50%", border: `5px solid ${D.sky}`, opacity: ripple > 0 && ripple < 1 ? 1 - ripple : 0, transform: `scale(${0.2 + ripple})` }} />
            <svg width="70" height="70" viewBox="0 0 24 24" style={{ position: "absolute", left: lerp(820, 600, cursorP) - 10, top: lerp(1500, SLOT0 + 72, cursorP) - 4, transform: `scale(${t > b(39) && t < b(39) + 0.12 ? 0.85 : 1})`, filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.5))" }}>
              <path d="M4 2l15 9.5-6.6 1.3 3.9 7.4-2.9 1.5-3.9-7.4L4 19z" fill="#fff" stroke="#0B1020" strokeWidth={1.2} strokeLinejoin="round" />
            </svg>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================ 6 · Logo + appel à l'action

export const Outro: React.FC = () => {
  const t = useT();
  if (t < b(39.95)) return null;
  const LW = 820;
  const LH = (LW * 545) / 1673;
  const slam = tw(t, [b(40), b(40) + 0.22], [0, 1], E.snap);
  const slide = tw(t, [b(41) - 0.05, b(41) + 0.45], [0, 1], E.expo);
  const reveal = tw(t, [b(41), b(41) + 0.6], [0, 1], E.expo);
  const sh = shake(t, b(40), 12, 0.4);
  const halfPulse = [44, 46, 48].reduce((acc, k) => acc + (t >= b(k) ? Math.exp(-(t - b(k)) / 0.15) : 0) * (t >= b(k) ? 1 : 0), 0);
  const cta = tw(t, [b(43), b(43) + 0.35], [0, 1], E.back);
  const bio = tw(t, [b(43.5), b(43.5) + 0.35], [0, 1], E.back);
  const shine = ((t - b(44)) % 1.6) / 1.6;
  const float = Math.sin(t * 1.6) * 6;
  const push = 1 + tw(t, [b(42), b(52)], [0, 0.07], (v) => v);
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <Rays at={b(40)} until={b(52) + 1} y={840} color="rgba(91,134,229,0.35)" />
      {Array.from({ length: 16 }).map((_, i) => (
        <Sparkle key={i} x={90 + ((i * 397) % 900)} y={420 + ((i * 251) % 1250)} at={b(43.5 + i * 0.5)} size={18 + ((i * 7) % 22)} />
      ))}
      <div style={{ position: "absolute", left: 540 - 700, top: 840 - 700, width: 1400, height: 1400, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,134,229,0.55) 0%, transparent 60%)", opacity: tw(t, [b(40), b(40) + 0.3], [0, 1]) * (0.8 + halfPulse * 0.3) }} />
      <div
        style={{
          position: "absolute",
          left: 540 - LW / 2,
          top: 840 - LH / 2 + float,
          width: LW,
          height: LH,
          transform: `translate(${sh.x + (1 - slide) * LW * 0.343}px, ${sh.y}px) scale(${(2.6 - 1.6 * slam) * (1 + halfPulse * 0.02)}) rotate(${(1 - slam) * -10}deg)`,
          filter: `blur(${(1 - slam) * 20}px) drop-shadow(0 0 40px rgba(91,134,229,0.6))`,
          opacity: Math.min(1, slam * 3),
          clipPath: `inset(-20% ${(1 - reveal) * 64}% -20% -20%)`,
        }}
      >
        <Img src={staticFile("brand/logo-full-light.png")} style={{ width: "100%", height: "100%" }} />
      </div>
      <Shockwave at={b(40)} y={840} size={2000} />
      <Shockwave at={b(41)} y={840} color={D.bright} size={1400} />
      <Sparkle x={150} y={700} at={b(41.3)} size={44} />
      <Sparkle x={950} y={640} at={b(41.6)} size={34} />
      <Sparkle x={900} y={1010} at={b(42)} size={30} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1060 }}>
        <MaskUp at={b(42)} style={{ ...H1, fontSize: 70, fontWeight: 700 }}>
          Ton commerce mérite
        </MaskUp>
        <MaskUp at={b(42.25)} style={{ ...H1, fontSize: 78 }}>
          <span style={gradText(t)}>un site à sa hauteur.</span>
        </MaskUp>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1360, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div
          style={{
            transform: `scale(${cta * (1 + halfPulse * 0.03)})`,
            opacity: Math.min(1, cta * 2),
            position: "relative",
            overflow: "hidden",
            padding: "30px 64px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${D.bright}, ${D.blue})`,
            boxShadow: "0 0 0 1px rgba(255,255,255,0.25) inset, 0 0 60px rgba(91,134,229,0.7), 0 24px 50px -16px rgba(0,0,0,0.6)",
            fontFamily: POP,
            fontWeight: 700,
            fontSize: 46,
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          Demande ton site
          {t > b(44) && <div style={{ position: "absolute", top: 0, bottom: 0, width: 110, left: `${shine * 170 - 35}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)", transform: "skewX(-20deg)" }} />}
        </div>
        <div style={{ transform: `scale(${bio})`, opacity: Math.min(1, bio * 2), display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: POP, fontWeight: 600, fontSize: 32, color: "#fff", padding: "12px 30px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)" }}>Lien en bio</div>
          <svg width="44" height="44" viewBox="0 0 24 24" style={{ transform: `translateY(${Math.sin(t * 6) * 7}px)` }}>
            <path d="M12 4v15m0 0l-6-6m6 6l6-6" stroke={D.sky} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export { Flash, Night };
