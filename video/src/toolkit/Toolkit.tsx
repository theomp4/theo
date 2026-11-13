// ReviewMaker — film « toolkit » façon keynote : 1080×1920, 60 i/s, 47 s.
// Enchaînement continu inspiré d'un toolkit de motion design produit (anneau 3D, frappe géante, roue de liste,
// barre de recherche, compteur, cartes d'avis, pile de cartes, bouton final), aux couleurs de la marque.
// Timeline et sons partagés avec scripts/toolkit_audio.py via cues.json.
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useVideoConfig } from "remotion";
import cues from "./cues.json";
import {
  EASE, K, Letters, Pane, Pointer, Scene, Shot, Stars, Typed, clamp01, fontFamily, lerp, shadowText, sp, textWidth, tw, typedCount, useT,
} from "./kit";

export const TOOLKIT_DURATION = cues.duration;
const S = cues.scenes as unknown as Record<string, [number, number]>;
const W = 1080;
const H = 1920;
const abs = (x: number, y: number, extra?: React.CSSProperties): React.CSSProperties => ({ position: "absolute", left: x, top: y, ...extra });
const row: React.CSSProperties = { position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center" };

// ───────────── 1. Titre
const Title: React.FC<{ lt: number }> = ({ lt }) => {
  const split = tw(lt, [2.35, 3.2], [0, 1], EASE.in);
  return (
    <>
      <div style={{ ...row, top: 820, transform: `translateX(${-split * 260}px)` }}>
        <Letters text="Review" t={lt} at={0.15} size={150} per={0.06} out={split} />
        <div style={{ transform: `translateX(${split * 520}px)` }}>
          <Letters text="Maker" t={lt} at={0.5} size={150} per={0.06} accentFrom={0} out={split} />
        </div>
      </div>
      <div style={{ ...row, top: 1010 }}>
        <Letters text="Sites internet & avis Google" t={lt} at={1.05} size={46} per={0.022} weight={500} out={split} />
      </div>
    </>
  );
};

// ───────────── 2. Anneau 3D de captures autour du texte
const RING = ["resto-full", "barbier-photo", "garage-titre", "gym-titre", "resto-titre", "barbier-titre", "garage-form", "gym-full", "resto-salle", "barbier-full", "garage-full", "gym-titre"];
const Ring: React.FC<{ lt: number }> = ({ lt }) => {
  const open = tw(lt, [0.05, 1.0], [0.05, 1], EASE.out);
  const rot = lt * 0.85 + 0.6;
  const R = 470 * open;
  const P = 1500;
  const cards = RING.map((name, i) => {
    const th = (i / RING.length) * Math.PI * 2 + rot;
    let x = Math.cos(th) * R;
    let z = Math.sin(th) * R;
    let y = Math.sin(th * 2 + i) * 40 * open;
    const ax = (-24 * Math.PI) / 180;
    const az = (-14 * Math.PI) / 180;
    const y2 = y * Math.cos(ax) - z * Math.sin(ax);
    const z2 = y * Math.sin(ax) + z * Math.cos(ax);
    const x3 = x * Math.cos(az) - y2 * Math.sin(az);
    const y3 = x * Math.sin(az) + y2 * Math.cos(az);
    const s = P / (P - z2);
    return { name, i, x: 540 + x3 * s, y: 900 + y3 * s, s, z: z2 };
  });
    return (
    <>
      {cards
        .sort((a, b) => a.z - b.z)
        .map((c) => {
          const w = 200 * c.s;
          const h = 140 * c.s;
          const blur = Math.max(0, -c.z / R) * 3.5;
          return (
            <div key={c.i} style={{ ...abs(c.x - w / 2, c.y - h / 2), width: w, height: h, zIndex: c.z > R * 0.55 ? 3 : 1, filter: blur > 0.2 ? `blur(${blur}px)` : undefined, opacity: tw(lt, [0.05 + c.i * 0.03, 0.35 + c.i * 0.03], [0, 1]) }}>
              <div style={{ width: "100%", height: "100%", borderRadius: 18 * c.s, overflow: "hidden", border: "2px solid rgba(255,255,255,0.8)", boxShadow: "0 20px 40px -14px rgba(20,40,150,0.45)" }}>
                <Shot name={c.name} />
              </div>
            </div>
          );
        })}
      <div style={{ ...row, top: 860, zIndex: 4 }}>
        <Letters text="Votre commerce," t={lt} at={0.55} size={84} />
      </div>
      <div style={{ ...row, top: 960, zIndex: 4 }}>
        <Letters text="visible partout." t={lt} at={0.95} size={84} accentFrom={0} />
      </div>
    </>
  );
};

// ───────────── 3. Cartes d'interface en verre qui flottent
const UiCard: React.FC<{ kind: number; w: number; h: number }> = ({ kind, w, h }) => {
  const bar = (wd: number | string, c = "rgba(0,85,253,0.28)", hh = 12): React.CSSProperties => ({ width: wd, height: hh, borderRadius: hh / 2, background: c });
  return (
    <Pane radius={26} style={{ width: w, height: h, padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
      {kind === 0 && (
        <>
          <div style={{ height: h * 0.42, borderRadius: 14, background: "linear-gradient(135deg, rgba(0,85,253,0.55), rgba(110,170,255,0.45))" }} />
          <div style={bar("70%", "rgba(0,85,253,0.45)", 16)} />
          <div style={bar("90%")} />
          <div style={{ ...bar(150, "#0055FD", 34), marginTop: 6, color: "#fff", fontFamily, fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>Réserver</div>
        </>
      )}
      {kind === 1 && (
        <>
          <Stars size={30} />
          <div style={bar("85%")} />
          <div style={bar("60%")} />
          <div style={bar("75%")} />
        </>
      )}
      {kind === 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, height: "100%" }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 6, background: i % 5 === 0 ? "rgba(140,230,255,0.75)" : i % 3 === 0 ? "rgba(0,85,253,0.45)" : "rgba(0,85,253,0.18)" }} />
          ))}
        </div>
      )}
      {kind === 3 && (
        <>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ ...bar(90, "rgba(0,85,253,0.55)", 60), borderRadius: 14 }} />
            <div style={{ ...bar(90, "rgba(140,230,255,0.8)", 60), borderRadius: 14 }} />
          </div>
          <div style={bar("80%", "rgba(0,85,253,0.4)", 14)} />
          <div style={bar("55%")} />
        </>
      )}
      {kind === 4 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <svg width={w * 0.45} height={w * 0.55} viewBox="0 0 40 50">
            <path d="M4 2h22l10 10v36H4z" fill="rgba(255,255,255,0.85)" stroke="rgba(0,85,253,0.6)" strokeWidth="2" />
            <path d="M10 22h20M10 30h20M10 38h14" stroke="rgba(0,85,253,0.5)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </Pane>
  );
};
const CARDS: [number, number, number, number, number, number][] = [
  // x, y, w, h, type, profondeur (parallaxe)
  [60, 330, 360, 330, 0, 1.0], [470, 260, 250, 200, 4, 0.7], [760, 360, 300, 220, 1, 1.1], [520, 540, 360, 300, 2, 0.9],
  [90, 720, 330, 230, 3, 0.8], [880, 640, 200, 240, 4, 1.2], [140, 1010, 380, 300, 2, 1.1], [560, 900, 420, 360, 0, 1.0],
  [40, 1380, 300, 220, 1, 0.9], [400, 1330, 220, 250, 4, 0.75], [660, 1320, 380, 260, 3, 1.15], [180, 1660, 360, 220, 1, 1.0],
  [600, 1640, 300, 300, 2, 0.85],
];
const UiFloat: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ transform: `perspective(2400px) rotateX(${lerp(16, 8, lt / 3)}deg) rotateZ(-6deg) scale(${lerp(1.18, 1.0, tw(lt, [0, 3], [0, 1], EASE.out))})` }}>
      {CARDS.map(([x, y, w, h, kind, d], i) => {
        const s = sp(lt, 0.05 + i * 0.06, fps, { damping: 16, stiffness: 120, mass: 0.8 });
        return (
          <div key={i} style={{ ...abs(x - lt * 30 * d, y - lt * 70 * d), transform: `translateY(${(1 - s) * 140}px) scale(${lerp(0.8, 1, s)})`, opacity: Math.min(1, s * 1.4) }}>
            <UiCard kind={kind} w={w} h={h} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ───────────── 4. Frappe géante, la caméra suit le curseur
const BIG = "Payé une seule fois.";
const BIG_SIZE = 290;
const BigType: React.FC<{ lt: number }> = ({ lt }) => {
  const at = 0.3;
  const rate = 0.1;
  const n = typedCount(lt, at, BIG.length, rate);
  const full = textWidth(BIG, BIG_SIZE);
  const typedW = textWidth(BIG.slice(0, n), BIG_SIZE);
  const zoom = tw(lt, [2.95, 3.9], [0, 1], EASE.inOut);
  const fitScale = 1000 / full;
  const scale = lerp(1, fitScale, zoom);
  // caméra : le curseur reste vers 72 % de la largeur, puis on recule pour voir toute la phrase
  const camX = lerp(Math.min(0, W * 0.72 - 60 - typedW), (W - full * fitScale) / 2 / fitScale - 60, zoom);
  const smooth = camX;
  return (
    <>
      <div style={{ ...abs(0, 960 - BIG_SIZE * 0.6), transform: `scale(${scale}) translateX(${smooth}px)`, transformOrigin: "0 50%" }}>
        <div style={{ paddingLeft: 60 }}>
          <Typed text={BIG} t={lt} at={at} size={BIG_SIZE} rate={rate} accentFrom={2} />
        </div>
      </div>
      <div style={{ ...row, top: 1180 }}>
        <Letters text="Un prix fixe. Sans abonnement." t={lt} at={3.55} size={46} weight={500} per={0.02} />
      </div>
    </>
  );
};

// ───────────── 5. Lignes en verre qui arrivent en 3D
const ROWS = [
  ["page", "Jusqu'à 6 pages, animations comprises"],
  ["google", "Textes rédigés pour vous, pensés pour Google"],
  ["cal", "Réservation ou prise de rendez-vous"],
  ["star", "Fiche et avis Google mis en avant"],
  ["globe", "Nom de domaine offert la 1re année"],
];
const Icon: React.FC<{ k: string }> = ({ k }) => {
  const st = { fill: "none", stroke: "#0055FD", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="44" height="44" viewBox="0 0 24 24">
      {k === "page" && <path {...st} d="M6 3h8l4 4v14H6zM9 12h6M9 16h6" />}
      {k === "google" && <path {...st} d="M20 12.2c0 4.6-3.2 7.8-8 7.8a8 8 0 110-16c2.1 0 3.9.8 5.3 2.1M20 12h-8" />}
      {k === "cal" && <path {...st} d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />}
      {k === "star" && <path {...st} d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.8 6.6 19.6l1.1-6-4.5-4.2 6.1-.8z" />}
      {k === "globe" && <path {...st} d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />}
    </svg>
  );
};
const Rows: React.FC<{ lt: number }> = ({ lt }) => {
  const inn = tw(lt, [0.0, 1.0], [0, 1], EASE.out);
  const out = tw(lt, [2.8, 3.45], [0, 1], EASE.in);
  return (
    <>
      <div style={{ ...row, top: 330 }}>
        <Letters text="Tout est compris." t={lt} at={0.2} size={88} accentFrom={2} />
      </div>
      <AbsoluteFill style={{ transform: `perspective(1800px) translateY(${(1 - inn) * 300 - out * 200}px) rotateX(${lerp(58, 4, inn) - out * 40}deg) rotateZ(${lerp(-10, 0, inn)}deg)` }}>
        {ROWS.map(([ic, label], i) => {
          const a = 0.25 + i * 0.13;
          const p = tw(lt, [a, a + 0.6], [0, 1], EASE.out);
          return (
            <div key={label} style={{ ...abs(80, 620 + i * 190), width: 920, opacity: p, transform: `translateZ(${(1 - p) * -300}px) translateX(${(1 - p) * 80}px)`, filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined }}>
              <Pane radius={34} style={{ height: 150, display: "flex", alignItems: "center", gap: 28, padding: "0 34px" }}>
                <div style={{ width: 84, height: 84, borderRadius: 24, background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px -8px rgba(0,60,200,0.4)" }}>
                  <Icon k={ic} />
                </div>
                <Typed text={label} t={lt} at={a + 0.25} size={36} rate={0.022} weight={500} caret={false} style={{ color: "#0A2A9E", textShadow: "none" }} />
              </Pane>
            </div>
          );
        })}
      </AbsoluteFill>
    </>
  );
};

// ───────────── 6. Roue de liste (sélecteur)
const JOBS = ["Restaurant", "Barbier", "Garage auto", "Salle de sport", "Coiffeur", "Boulangerie", "Artisan", "Fleuriste", "Institut de beauté", "Boutique", "Votre métier"];
export const WHEEL_STOPS = JOBS.map((_, i) => 0.55 + i * 0.27);
const Wheel: React.FC<{ lt: number }> = ({ lt }) => {
  // défilement par crans : chaque cran avance rapidement puis marque un temps
  let pos = 0;
  WHEEL_STOPS.forEach((s, i) => {
    if (i === 0) return;
    pos += tw(lt, [s - 0.2, s], [0, 1], EASE.inOut);
  });
  const cy = 1080;
  return (
    <>
      <div style={{ ...row, top: 300 }}>
        <Letters text="Un site pensé" t={lt} at={0.1} size={88} />
      </div>
      <div style={{ ...row, top: 404 }}>
        <Letters text="pour votre métier." t={lt} at={0.35} size={88} accentFrom={1} />
      </div>
      <div style={{ ...abs(90, cy - 75), width: 900, opacity: tw(lt, [0.3, 0.7], [0, 1]) }}>
        <Pane radius={40} style={{ height: 150 }} glow={0.4} />
      </div>
      {JOBS.map((j, i) => {
        const d = i - pos;
        const ang = d * 0.42;
        if (Math.abs(ang) > 1.5) return null;
        const y = cy + Math.sin(ang) * 520;
        const c = Math.cos(ang);
        const center = clamp01(1 - Math.abs(d) * 1.6);
        return (
          <div
            key={j}
            style={{
              ...row,
              top: y - 50,
              height: 100,
              alignItems: "center",
              transform: `perspective(1200px) rotateX(${-ang * 57}deg) scale(${0.72 + 0.28 * c})`,
              opacity: (0.18 + 0.82 * c * c) * tw(lt, [0.2, 0.6], [0, 1]),
              fontFamily,
              fontSize: 72,
              fontWeight: center > 0.5 ? 700 : 500,
              color: center > 0.5 ? "#0A2A9E" : "#FFFFFF",
              letterSpacing: "-0.03em",
              textShadow: center > 0.5 ? "none" : shadowText,
              filter: Math.abs(d) > 0.6 ? `blur(${Math.min(4, Math.abs(d) * 1.2)}px)` : undefined,
            }}
          >
            {j}
          </div>
        );
      })}
    </>
  );
};

// ───────────── 7. Recherche Google + clic
const QUERY = "barbier près de chez moi";
const Search: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  const zoom = tw(lt, [1.75, 2.6], [0, 1], EASE.inOut);
  const sc = lerp(2.3, 1, zoom);
  const ptr = tw(lt, [2.45, 3.0], [0, 1], EASE.out);
  const click = 3.05;
  const press = tw(lt, [click - 0.06, click], [0, 1]) * (1 - tw(lt, [click + 0.05, click + 0.3], [0, 1]));
  const ring = tw(lt, [click, click + 0.7], [0, 1], (x) => x);
  const btn = sp(lt, 2.2, fps, { damping: 12, stiffness: 160, mass: 0.7 });
  return (
    <>
      <AbsoluteFill style={{ transform: `scale(${sc})`, transformOrigin: `${lerp(180, 540, zoom)}px 900px` }}>
        <div style={{ ...abs(60, 830), width: 790 }}>
          <Pane radius={999} style={{ height: 140, display: "flex", alignItems: "center", padding: "0 44px", gap: 22 }}>
            <svg width="40" height="40" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <Typed text={QUERY} t={lt} at={0.3} size={46} rate={0.055} weight={500} style={{ color: "#0A2A9E", textShadow: "none" }} />
          </Pane>
        </div>
        <div style={{ ...abs(875, 830), width: 140, height: 140, transform: `scale(${lerp(0.4, 1, btn) * (1 - 0.08 * press)})`, opacity: Math.min(1, btn * 1.5) }}>
          <Pane radius={70} glow={press * 0.8} style={{ width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center", background: `rgba(255,255,255,${0.5 + 0.4 * press})` }}>
            <svg width="56" height="56" viewBox="0 0 24 24">
              <path d="M10.5 4a6.5 6.5 0 104.1 11.5L20 21" fill="none" stroke="#0055FD" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </Pane>
          {ring > 0 && ring < 1 && (
            <div style={{ ...abs(70 - 70 * (1 + ring), 70 - 70 * (1 + ring)), width: 140 * (1 + ring), height: 140 * (1 + ring), borderRadius: "50%", border: `3px solid rgba(255,255,255,${1 - ring})` }} />
          )}
        </div>
        <div style={{ ...abs(lerp(1200, 965, ptr), lerp(1250, 915, ptr)), opacity: ptr }}>
          <Pointer size={74} press={press} />
        </div>
      </AbsoluteFill>
      <div style={{ ...row, top: 1120 }}>
        <Letters text="Vos clients vous trouvent." t={lt} at={3.2} size={64} accentFrom={2} />
      </div>
    </>
  );
};

// ───────────── 8. Phrase + étiquettes flottantes
const TAGS: [string, number, number, number][] = [
  ["Sur mesure", 120, 560, 1.0], ["À votre nom", 640, 470, 0.7], ["Aperçu offert", 700, 690, 1.1], ["Sans engagement", 80, 760, 0.6],
  ["En ligne en 5 à 10 jours", 170, 1260, 1.0], ["Pensé pour Google", 640, 1180, 0.8], ["Mobile", 820, 1400, 0.65], ["Sans abonnement", 110, 1460, 0.75],
];
const Tags: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {TAGS.map(([label, x, y, d], i) => {
        const s = sp(lt, 0.4 + i * 0.12, fps, { damping: 13, stiffness: 150, mass: 0.7 });
        const far = d < 0.8;
        return (
          <div key={label} style={{ ...abs(x + Math.sin(lt * 0.8 + i) * 18 * d, y - lt * 26 * d), transform: `scale(${lerp(0.5, d, s)})`, transformOrigin: "0 0", opacity: Math.min(1, s * 1.4) * (far ? 0.75 : 1), filter: far ? "blur(2px)" : undefined }}>
            <Pane radius={999} outline style={{ padding: "18px 36px" }}>
              <div style={{ fontFamily, fontSize: 34, fontWeight: 500, color: "#fff", whiteSpace: "nowrap", textShadow: shadowText }}>{label}</div>
            </Pane>
          </div>
        );
      })}
      <div style={{ ...row, top: 880 }}>
        <Typed text="Voyez votre site" t={lt} at={0.15} size={92} rate={0.05} caret={false} />
      </div>
      <div style={{ ...row, top: 990 }}>
        <Typed text="avant de payer." t={lt} at={0.15 + 16 * 0.05} size={92} rate={0.05} accentFrom={0} />
      </div>
    </>
  );
};

// ───────────── 9. Mur de réalisations en parallaxe
const WALL: [string, number, number, number, number, number][] = [
  ["resto-full", 40, 160, 520, 330, 1.0], ["barbier-photo", 600, 80, 400, 520, 0.8], ["gym-titre", 70, 560, 430, 280, 1.2], ["garage-form", 560, 660, 450, 370, 0.9],
  ["barbier-titre", 30, 1300, 470, 380, 1.1], ["resto-salle", 540, 1180, 500, 320, 0.85], ["garage-titre", 600, 1560, 440, 280, 1.2], ["gym-full", 60, 1740, 480, 300, 0.9],
];
const Wall: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {WALL.map(([name, x, y, w, h, d], i) => {
        const s = sp(lt, 0.05 + i * 0.05, fps, { damping: 17, stiffness: 110, mass: 0.9 });
        return (
          <div key={i} style={{ ...abs(x, y - lt * 90 * d + (1 - s) * 300), width: w, height: h, opacity: Math.min(1, s * 1.5), transform: `scale(${lerp(0.85, 1, s)})` }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 26, overflow: "hidden", border: "2px solid rgba(255,255,255,0.85)", boxShadow: "0 30px 60px -20px rgba(20,40,150,0.5)" }}>
              <Shot name={name} />
            </div>
          </div>
        );
      })}
      <div style={{ ...row, top: 880 }}>
        <Pane radius={44} style={{ padding: "34px 56px" }} strength={0.8}>
          <Letters text="Nos réalisations," t={lt} at={0.35} size={72} color="#0A2A9E" />
          <Letters text="métier par métier." t={lt} at={0.65} size={72} color="#0055FD" />
        </Pane>
      </div>
    </>
  );
};

// ───────────── 10. Compteur de prix + courbe
const Counter: React.FC<{ lt: number }> = ({ lt }) => {
  const a1 = 0.25;
  const a2 = 2.3;
  const v = lt < a2 ? tw(lt, [a1, a1 + 1.4], [0, 990], EASE.out) : tw(lt, [a2, a2 + 1.1], [990, 1790], EASE.out);
  const prog = lt < a2 ? tw(lt, [a1, a1 + 1.4], [0, 0.55], EASE.out) : tw(lt, [a2, a2 + 1.1], [0.55, 1], EASE.out);
  const label = lt < a2 - 0.15 ? "Site vitrine · payé une fois" : "Boutique en ligne · payée une fois";
  const inst = lt < a2 - 0.15 ? "ou 3 × 330 € sans frais" : "ou 3 × 597 € sans frais";
  const sw = tw(lt, [a2 - 0.3, a2 - 0.1], [0, 1]) * (1 - tw(lt, [a2 + 0.05, a2 + 0.3], [0, 1]));
  // courbe : de bas-gauche vers haut-droite
  const pts = Array.from({ length: 61 }, (_, i) => {
    const u = i / 60;
    return [80 + u * 920, 1270 - (u * u * 0.6 + u * 0.4) * 420 - Math.sin(u * 7) * 18 * (1 - u)];
  });
  const k = Math.max(1, Math.round(prog * 60));
  const d = pts.slice(0, k + 1).map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const ball = pts[k];
  const num = Math.round(v).toLocaleString("fr-FR").replace(/ | /g, " ") + " €";
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <linearGradient id="cv" x1="0" x2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="1" stopColor="#A6F0FF" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#cv)" strokeWidth={22} strokeLinecap="round" opacity={0.35} style={{ filter: "blur(10px)" }} />
        <path d={d} fill="none" stroke="url(#cv)" strokeWidth={9} strokeLinecap="round" />
      </svg>
      <div
        style={{
          ...abs(ball[0] - 42, ball[1] - 42),
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #CFF6FF 30%, #6FA8FF 75%, #3D6BFF 100%)",
          boxShadow: "0 0 50px rgba(166,240,255,0.9), 0 12px 30px rgba(20,40,150,0.4)",
          opacity: tw(lt, [a1, a1 + 0.2], [0, 1]),
        }}
      />
      <div style={{ ...row, top: 520, opacity: tw(lt, [0.05, 0.3], [0, 1]), transform: `scale(${1 + sw * 0.04})`, filter: sw > 0.05 ? `blur(${sw * 6}px)` : undefined }}>
        <div style={{ fontFamily, fontSize: 250, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 1, backgroundImage: "linear-gradient(180deg, #FFFFFF 30%, #B6F2FF 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 10px 30px rgba(10,40,170,0.35))", whiteSpace: "nowrap" }}>
          {num}
        </div>
      </div>
      <div style={{ ...row, top: 820, opacity: 1 - sw }}>
        <div style={{ fontFamily, fontSize: 48, fontWeight: 600, color: "#fff", textShadow: shadowText }}>{label}</div>
      </div>
      <div style={{ ...row, top: 1380, opacity: tw(lt, [0.9, 1.3], [0, 1]) * (1 - sw) }}>
        <Pane radius={999} outline style={{ padding: "20px 44px" }}>
          <div style={{ fontFamily, fontSize: 38, fontWeight: 500, color: "#fff", textShadow: shadowText }}>{inst}</div>
        </Pane>
      </div>
    </>
  );
};

// ───────────── 11. Cartes d'avis + tag NFC
const AV = ["#FF8A65", "#4DB6AC", "#9575CD", "#F06292", "#64B5F6", "#FFB74D", "#81C784", "#BA68C8", "#4FC3F7", "#E57373"];
const Reviews: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  const tag = sp(lt, 0.6, fps, { damping: 15, stiffness: 90, mass: 1 });
  const cards = Array.from({ length: 12 }, (_, i) => ({ x: (i % 2) * 520 + ((i >> 1) % 2) * 60 - 20, y: 120 + Math.floor(i / 2) * 300 + (i % 2) * 120, d: 0.7 + ((i * 37) % 10) / 20, i }));
  return (
    <>
      <AbsoluteFill style={{ transform: `perspective(2200px) rotateX(18deg) rotateY(-14deg) translateY(${-lt * 60}px)` }}>
        {cards.map((c) => {
          const s = sp(lt, 0.05 + c.i * 0.05, fps, { damping: 15, stiffness: 120, mass: 0.8 });
          return (
            <div key={c.i} style={{ ...abs(c.x, c.y - lt * 40 * c.d), opacity: Math.min(1, s * 1.4) * 0.92, transform: `translateZ(${(c.d - 1) * 300}px) scale(${lerp(0.8, 1, s)})` }}>
              <Pane radius={28} style={{ width: 460, height: 170, padding: "26px 30px", display: "flex", gap: 22 }}>
                <div style={{ width: 70, height: 70, borderRadius: 35, background: `linear-gradient(160deg, ${AV[c.i % AV.length]}, #ffffff80)`, flexShrink: 0, color: "#fff", fontFamily, fontWeight: 700, fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {"ACLMSJNPEV"[c.i % 10]}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Stars size={30} t={lt} at={0.3 + c.i * 0.05} />
                  <div style={{ width: 280, height: 12, borderRadius: 6, background: "rgba(0,85,253,0.28)" }} />
                  <div style={{ width: 200, height: 12, borderRadius: 6, background: "rgba(0,85,253,0.18)" }} />
                </div>
              </Pane>
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 40% at 50% 52%, rgba(40,80,240,0.55), transparent 75%)", opacity: tag }} />
      <div style={{ ...abs(540 - 230, 700), width: 460, height: 475, transform: `perspective(1600px) rotateY(${Math.sin(lt * 1.1) * 12}deg) translateY(${(1 - tag) * 200}px) scale(${lerp(0.6, 1, tag)})`, opacity: Math.min(1, tag * 1.5), filter: "drop-shadow(0 40px 50px rgba(10,20,90,0.55))" }}>
        <Img src={staticFile("rm26/rm26-tag-detoure.png")} style={{ width: 460, height: 475 }} />
      </div>
      <div style={{ ...row, top: 470 }}>
        <Letters text="Et vos avis Google" t={lt} at={0.9} size={84} />
      </div>
      <div style={{ ...row, top: 1240 }}>
        <Letters text="Le tag NFC qui récolte vos avis." t={lt} at={1.3} size={52} accentFrom={3} />
      </div>
      <div style={{ ...row, top: 1340 }}>
        <Pane radius={999} style={{ padding: "18px 44px", opacity: tw(lt, [2.0, 2.4], [0, 1]) }} glow={0.5}>
          <div style={{ fontFamily, fontSize: 36, fontWeight: 600, color: "#0A2A9E" }}>35 € · garantie à vie</div>
        </Pane>
      </div>
    </>
  );
};

// ───────────── 12. Pile de cartes qui défile
const DECK = ["resto-full", "barbier-full", "gym-full", "garage-full", "resto-salle", "barbier-photo"];
export const DECK_T = DECK.map((_, i) => 0.35 + i * 0.45);
const Deck: React.FC<{ lt: number }> = ({ lt }) => (
  <>
    {DECK.map((name, i) => {
      const a = DECK_T[i];
      const p = tw(lt, [a, a + 0.75], [0, 1], EASE.out);
      const gone = tw(lt, [a + 0.6, a + 1.25], [0, 1], EASE.in);
      if (p <= 0 || gone >= 1) return null;
      const x = lerp(900, 540, p) - gone * 700;
      const rz = lerp(14, -3, p) - gone * 10;
      return (
        <div key={i} style={{ ...abs(x - 330, 520 + i * 18 - gone * 60), width: 660, height: 820, zIndex: i, transform: `perspective(1800px) rotateY(${lerp(-35, 0, p) + gone * 30}deg) rotateZ(${rz}deg) scale(${lerp(0.85, 1, p) * (1 - gone * 0.15)})`, opacity: Math.min(1, p * 2) * (1 - gone) }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 40, overflow: "hidden", border: "3px solid rgba(255,255,255,0.9)", boxShadow: "0 50px 90px -30px rgba(10,30,140,0.6)" }}>
            <Shot name={name} style={{ objectPosition: "30% 50%" }} />
          </div>
        </div>
      );
    })}
    <div style={{ ...row, top: 1530, zIndex: 20 }}>
      <Letters text="Votre site," t={lt} at={0.5} size={104} />
    </div>
    <div style={{ ...row, top: 1652, zIndex: 20 }}>
      <Letters text="à votre nom." t={lt} at={0.8} size={104} accentFrom={1} />
    </div>
  </>
);

// ───────────── 13. Bouton final + clic
const CTA = "Demander mon aperçu gratuit";
const Final: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  const pill = sp(lt, 0.05, fps, { damping: 14, stiffness: 130, mass: 0.8 });
  const ptr = tw(lt, [1.75, 2.35], [0, 1], EASE.out);
  const click = 2.45;
  const press = tw(lt, [click - 0.06, click], [0, 1]) * (1 - tw(lt, [click + 0.06, click + 0.35], [0, 1]));
  const lit = tw(lt, [click, click + 0.3], [0, 1]);
  const ring = tw(lt, [click, click + 0.8], [0, 1], (x) => x);
  return (
    <>
      <div style={{ ...row, top: 860, transform: `scale(${lerp(0.6, 1, pill) * (1 - 0.05 * press)})`, opacity: Math.min(1, pill * 1.5) }}>
        <div style={{ position: "relative" }}>
          {ring > 0 && ring < 1 && (
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 880 * (1 + 0.15 * ring), height: 150 * (1 + 0.7 * ring), transform: "translate(-50%,-50%)", borderRadius: 999, border: `3px solid rgba(255,255,255,${1 - ring})` }} />
          )}
          <Pane radius={999} glow={0.3 + 0.6 * lit} style={{ height: 150, width: 880, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(160deg, rgba(255,255,255,${0.6 + 0.3 * lit}), rgba(255,255,255,${0.25 + 0.3 * lit}))` }}>
            <Typed text={CTA} t={lt} at={0.3} size={50} rate={0.04} weight={600} accentFrom={3} accentColor="#0055FD" caret={lt < 1.7} style={{ color: "#0A2A9E", textShadow: "none" }} />
          </Pane>
        </div>
      </div>
      <div style={{ ...abs(lerp(1150, 760, ptr), lerp(1350, 960, ptr)), opacity: ptr }}>
        <Pointer size={84} press={press} />
      </div>
      <div style={{ ...row, top: 560, opacity: tw(lt, [2.7, 3.2], [0, 1]), filter: `blur(${tw(lt, [2.7, 3.3], [12, 0])}px)` }}>
        <Img src={staticFile("rm26/rm26-logo-blanc.svg")} style={{ width: 560, filter: "drop-shadow(0 8px 24px rgba(10,40,170,0.35))" }} />
      </div>
      <div style={{ ...row, top: 1110, opacity: tw(lt, [2.9, 3.4], [0, 1]) }}>
        <div style={{ fontFamily, fontSize: 56, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", textShadow: shadowText }}>reviewmaker.fr</div>
      </div>
    </>
  );
};

export const Toolkit: React.FC = () => {
  const t = useT();
  const fade = tw(t, [TOOLKIT_DURATION - 0.6, TOOLKIT_DURATION], [0, 1], EASE.in);
  const sc = (k: string, C: React.FC<{ lt: number }>, extra: { first?: boolean; last?: boolean } = {}) => (
    <Scene t={t} from={S[k][0]} to={S[k][1]} {...extra}>
      {(lt) => <C lt={lt} />}
    </Scene>
  );
  return (
    <AbsoluteFill style={{ background: "#3D6BFF" }}>
      {sc("title", Title, { first: true })}
      {sc("ring", Ring)}
      {sc("ui", UiFloat)}
      {sc("type", BigType)}
      {sc("rows", Rows)}
      {sc("wheel", Wheel)}
      {sc("search", Search)}
      {sc("tags", Tags)}
      {sc("wall", Wall)}
      {sc("counter", Counter)}
      {sc("reviews", Reviews)}
      {sc("deck", Deck)}
      {sc("cta", Final, { last: true })}
      <AbsoluteFill style={{ background: "#fff", opacity: fade, pointerEvents: "none" }} />
      <Audio src={staticFile("toolkit/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
