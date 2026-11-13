// ReviewMaker — film promo « glass », 1080×1920, 60 i/s, 36 s, musique + design sonore (public/glass/soundtrack.wav).
// Timeline et repères sonores partagés avec scripts/glass_audio.py via cues.json.
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useVideoConfig } from "remotion";
import { EASE, fontFamily, tw } from "../theme";
import cues from "./cues.json";
import { AppIcon, Aurora, BlurWords, CheckDot, Chip, G, Glass, Grain, Scene, Star, lerp, sp, useT } from "./ui";

export const GLASS_DURATION = cues.duration;
const S = cues.scenes as Record<string, [number, number]>;

const center: React.CSSProperties = { position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center" };
const txt = (size: number, weight = 500, color = G.muted): React.CSSProperties => ({
  fontFamily,
  fontSize: size,
  fontWeight: weight,
  color,
  letterSpacing: "-0.015em",
  lineHeight: 1.3,
});
const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ");

// ───────────────────────── 1. Logo
const LogoScene: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  const pop = sp(lt, 0.15, fps, { damping: 12, stiffness: 110, mass: 0.9 });
  const lift = tw(lt, [2.2, 3.0], [0, 1], EASE.inOut);
  const size = lerp(400, 300, lift);
  const y = lerp(960, 760, lift);
  const rot = lerp(22, 0, pop);
  return (
    <>
      {/* halo derrière la tuile */}
      <div
        style={{
          position: "absolute",
          left: 540 - 520,
          top: y - 520,
          width: 1040,
          height: 1040,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(77,139,255,0.55), transparent 62%)",
          opacity: tw(lt, [0.2, 1.2], [0, 1]),
          transform: `scale(${lerp(0.6, 1, pop)})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 540 - size / 2,
          top: y - size / 2,
          transform: `perspective(1400px) rotateX(${rot}deg) scale(${lerp(0.55, 1, pop)})`,
          opacity: Math.min(1, pop * 1.6),
        }}
      >
        <AppIcon size={size} reveal={tw(lt, [0.45, 1.55], [0, 1], EASE.inOut)} sheen={tw(lt, [1.4, 2.3], [0, 1], EASE.inOut)} />
      </div>
      {/* reflet au sol */}
      <div
        style={{
          position: "absolute",
          left: 540 - size / 2,
          top: y + size / 2 + 24,
          width: size,
          height: size * 0.5,
          transform: "scaleY(-1)",
          opacity: 0.18 * pop * (1 - lift),
          maskImage: "linear-gradient(0deg, #000, transparent 70%)",
          WebkitMaskImage: "linear-gradient(0deg, #000, transparent 70%)",
          overflow: "hidden",
          filter: "blur(4px)",
        }}
      >
        <div style={{ position: "absolute", bottom: 0 }}>
          <AppIcon size={size} reveal={tw(lt, [0.45, 1.55], [0, 1], EASE.inOut)} />
        </div>
      </div>
      <div style={{ ...center, top: 960 }}>
        <div
          style={{
            opacity: tw(lt, [2.45, 3.0], [0, 1]),
            filter: `blur(${tw(lt, [2.45, 3.1], [16, 0])}px)`,
            transform: `translateY(${tw(lt, [2.45, 3.1], [40, 0])}px)`,
          }}
        >
          <Img src={staticFile("rm26/rm26-logo-blanc.svg")} style={{ width: 640 }} />
        </div>
      </div>
      <div style={{ ...center, top: 1210 }}>
        <Chip t={lt} at={2.7} label="Sites internet & avis Google" size={32} />
      </div>
    </>
  );
};

// ───────────────────────── 2. Accroche
const HookScene: React.FC<{ lt: number }> = ({ lt }) => (
  <>
    <div style={{ ...center, top: 560 }}>
      <BlurWords text="Votre site pro," t={lt} at={0.15} size={102} gradient style={{ whiteSpace: "nowrap" }} />
    </div>
    <div style={{ ...center, top: 690 }}>
      <BlurWords text="payé une seule fois." t={lt} at={0.45} size={102} gradient style={{ whiteSpace: "nowrap" }} />
    </div>
    <div style={{ ...center, top: 900 }}>
      <BlurWords text="Sur mesure, à votre nom. Sans abonnement." t={lt} at={1.0} size={40} weight={500} color={G.muted} stagger={0.04} spacing={-0.01} />
    </div>
    <div style={{ ...center, top: 1080, gap: 22, flexWrap: "wrap", padding: "0 80px" }}>
      <Chip t={lt} at={1.9} label="Sans engagement" />
      <Chip t={lt} at={2.1} label="Aperçu offert" />
      <Chip t={lt} at={2.3} label="En ligne en 5 à 10 jours" />
    </div>
    <div style={{ ...center, top: 1330 }}>
      <PriceBubble lt={lt} at={2.6} />
    </div>
  </>
);

const PriceBubble: React.FC<{ lt: number; at: number }> = ({ lt, at }) => {
  const { fps } = useVideoConfig();
  const s = sp(lt, at, fps, { damping: 11, stiffness: 150, mass: 0.8 });
  return (
    <div style={{ transform: `scale(${lerp(0.5, 1, s)})`, opacity: Math.min(1, s * 1.5) }}>
      <Glass radius={60} glow={0.8 * s} tint="rgba(0,85,253,0.45)" sheen={tw(lt, [at + 0.4, at + 1.2], [0, 1])} style={{ padding: "34px 70px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={txt(44, 500, G.ink)}>dès</span>
          <span style={{ ...txt(120, 700, "#fff"), letterSpacing: "-0.04em" }}>990 €</span>
        </div>
        <div style={{ ...txt(32, 500, G.ink), textAlign: "center", marginTop: 4 }}>ou en 3 fois sans frais</div>
      </Glass>
    </div>
  );
};

// ───────────────────────── 3. Réalisations
const SITES = [
  { img: "restaurant", url: "lecomptoirdeleon.fr", chip: "Restaurant & bar", sub: "Réservation de table" },
  { img: "salle-de-sport", url: "pulse-studio.fr", chip: "Salle de sport", sub: "Planning des cours" },
  { img: "barbier", url: "maison-lebrun.fr", chip: "Barbier", sub: "Rendez-vous en ligne" },
  { img: "garage", url: "garage-moreau.fr", chip: "Garage auto", sub: "Prestations et prix" },
];
const SITE_T0 = 0.75;
const SITE_DT = 1.3;

const SitesScene: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  const enter = sp(lt, 0.25, fps, { damping: 18, stiffness: 70, mass: 1.1 });
  const idx = Math.max(0, Math.min(3, Math.floor((lt - SITE_T0) / SITE_DT)));
  const rx = lerp(28, 7, enter) + Math.sin(lt * 0.9) * 1.5;
  const ry = Math.sin(lt * 0.6) * 5 - 3;
  const winW = 960;
  const scrH = (winW - 24) * (900 / 1440);
  return (
    <>
      <div style={{ ...center, top: 250 }}>
        <BlurWords text="Un site pensé" t={lt} at={0.1} size={92} gradient />
      </div>
      <div style={{ ...center, top: 350 }}>
        <BlurWords text="pour votre métier." t={lt} at={0.3} size={92} gradient />
      </div>
      <div
        style={{
          position: "absolute",
          left: 540 - winW / 2,
          top: 600,
          width: winW,
          transform: `perspective(2200px) translateY(${lerp(260, 0, enter)}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${lerp(0.85, 1, enter)})`,
          opacity: Math.min(1, enter * 1.5),
        }}
      >
        <Glass radius={34} style={{ padding: 12 }} sheen={tw(lt, [0.9, 1.8], [0, 1])}>
          {/* barre de navigateur */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: 56, padding: "0 10px" }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
              <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.9 }} />
            ))}
            <div
              style={{
                marginLeft: 90,
                flex: 1,
                marginRight: 120,
                height: 40,
                borderRadius: 20,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                ...txt(22, 500, G.ink),
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M7 10V7a5 5 0 0110 0v3M5 10h14v11H5z" fill="none" stroke="#DCE6FF" strokeWidth="2.4" strokeLinejoin="round" />
              </svg>
              {SITES[idx].url}
            </div>
          </div>
          {/* écran */}
          <div style={{ position: "relative", height: scrH, borderRadius: 22, overflow: "hidden", background: "#000" }}>
            {SITES.map((s, i) => {
              const a = SITE_T0 + i * SITE_DT;
              const pin = i === 0 ? 1 : tw(lt, [a - 0.05, a + 0.45], [0, 1], EASE.out);
              const vis = lt >= a - 0.05 || i === 0;
              if (!vis) return null;
              const scroll = tw(lt, [a, a + SITE_DT + 0.4], [0, -28], (x) => x);
              return (
                <div
                  key={s.img}
                  style={{
                    position: "absolute",
                    inset: 0,
                    clipPath: `inset(0 0 0 ${(1 - pin) * 100}%)`,
                    transform: `scale(${lerp(1.08, 1, pin)})`,
                  }}
                >
                  <Img
                    src={staticFile(`rm26/rm26-exemple-${s.img}.webp`)}
                    style={{ width: "100%", height: scrH + 40, objectFit: "cover", transform: `translateY(${scroll}px)` }}
                  />
                </div>
              );
            })}
          </div>
        </Glass>
      </div>
      {/* reflet sous la fenêtre */}
      <div
        style={{
          position: "absolute",
          left: 140,
          right: 140,
          top: 1280,
          height: 80,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,85,253,0.55), transparent 70%)",
          filter: "blur(20px)",
          opacity: enter,
        }}
      />
      <div style={{ position: "absolute", left: 70, right: 70, top: 1420, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
        {SITES.map((s, i) => {
          const a = SITE_T0 + i * SITE_DT;
          const on = tw(lt, [a, a + 0.3], [0, 1]) * (1 - tw(lt, [a + SITE_DT, a + SITE_DT + 0.3], [0, 1]) * (i < 3 ? 1 : 0));
          const s_ = sp(lt, 0.9 + i * 0.12, fps, { damping: 14, stiffness: 160, mass: 0.7 });
          return (
            <div key={s.chip} style={{ transform: `translateY(${(1 - s_) * 60}px) scale(${lerp(1, 1.04, on)})`, opacity: Math.min(1, s_ * 1.4) }}>
              <Glass radius={30} glow={on * 0.9} tint={`rgba(${lerp(255, 0, on)},${lerp(255, 85, on)},${lerp(255, 253, on)},${lerp(0.08, 0.42, on)})`} style={{ padding: "26px 30px" }}>
                <div style={txt(36, 600, G.ink)}>{s.chip}</div>
                <div style={{ ...txt(26, 500, G.muted), marginTop: 4 }}>{s.sub}</div>
              </Glass>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ───────────────────────── 4. Étapes
const STEPS = [
  ["On en parle", "Votre activité, vos photos, vos besoins."],
  ["Aperçu gratuit", "On prépare votre page d'accueil."],
  ["Vous validez", "Il vous plaît ? Vous réglez le 1er tiers."],
  ["En ligne", "En 5 à 10 jours, vous relisez, on ajuste."],
];
const StepsScene: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  const top0 = 560;
  const gap = 228;
  const fill = tw(lt, [0.55, 0.55 + 0.7 * 3], [0, 1], (x) => x);
  return (
    <>
      <div style={{ ...center, top: 220 }}>
        <BlurWords text="Votre site en 4 étapes." t={lt} at={0.1} size={88} gradient />
      </div>
      <div style={{ ...center, top: 360, padding: "0 120px" }}>
        <BlurWords text="Vous ne payez rien tant que l'aperçu ne vous plaît pas." t={lt} at={0.4} size={36} weight={500} color={G.muted} stagger={0.03} spacing={-0.01} />
      </div>
      {/* ligne de progression */}
      <div style={{ position: "absolute", left: 160, top: top0 + 95, width: 6, height: gap * 3, borderRadius: 3, background: "rgba(255,255,255,0.12)" }} />
      <div
        style={{
          position: "absolute",
          left: 160,
          top: top0 + 95,
          width: 6,
          height: gap * 3 * fill,
          borderRadius: 3,
          background: "linear-gradient(180deg, #8FB8FF, #0055FD)",
          boxShadow: "0 0 24px rgba(0,85,253,0.9)",
        }}
      />
      {STEPS.map(([h, d], i) => {
        const a = 0.55 + i * 0.7;
        const s = sp(lt, a, fps, { damping: 15, stiffness: 140, mass: 0.8 });
        const on = tw(lt, [a, a + 0.3], [0, 1]);
        return (
          <div
            key={h}
            style={{
              position: "absolute",
              left: 90,
              right: 90,
              top: top0 + i * gap,
              transform: `translateX(${(1 - s) * 120}px)`,
              opacity: Math.min(1, s * 1.5),
            }}
          >
            <Glass radius={36} sheen={tw(lt, [a + 0.1, a + 0.8], [0, 1])} style={{ height: 190, padding: "0 40px 0 150px", display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: 190 }}>
                <div style={txt(46, 600, G.ink)}>{h}</div>
                <div style={{ ...txt(30, 500, G.muted), marginTop: 6 }}>{d}</div>
              </div>
            </Glass>
            <div
              style={{
                position: "absolute",
                left: 22,
                top: 45,
                width: 100,
                height: 100,
                borderRadius: 50,
                background: on > 0 ? `linear-gradient(160deg, rgba(77,139,255,${on}), rgba(0,85,253,${on}))` : "rgba(255,255,255,0.1)",
                border: "1.5px solid rgba(255,255,255,0.35)",
                boxShadow: `0 0 ${40 * on}px rgba(0,85,253,${0.9 * on}), inset 0 1.5px 0 rgba(255,255,255,0.5)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...txt(48, 700, "#fff"),
              }}
            >
              {i + 1}
            </div>
          </div>
        );
      })}
      <div style={{ ...center, top: 1520 }}>
        <ZeroBadge lt={lt} at={3.05} />
      </div>
    </>
  );
};
const ZeroBadge: React.FC<{ lt: number; at: number }> = ({ lt, at }) => {
  const { fps } = useVideoConfig();
  const s = sp(lt, at, fps, { damping: 11, stiffness: 160, mass: 0.7 });
  return (
    <div style={{ transform: `scale(${lerp(0.5, 1, s)})`, opacity: Math.min(1, s * 1.5) }}>
      <Glass radius={999} glow={s * 0.8} tint="rgba(0,85,253,0.45)" sheen={tw(lt, [at + 0.3, at + 1.0], [0, 1])} style={{ padding: "26px 56px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ ...txt(72, 700, "#fff"), letterSpacing: "-0.04em" }}>0 €</span>
          <span style={txt(36, 500, G.ink)}>pour voir l'aperçu</span>
        </div>
      </Glass>
    </div>
  );
};

// ───────────────────────── 5. Tarifs
const PLANS = [
  { name: "Site vitrine", price: 990, inst: "ou 3 × 330 € sans frais", feats: ["Jusqu'à 6 pages, animations comprises", "Textes rédigés pour vous, pensés pour Google", "Réservation ou prise de rendez-vous"], note: "" },
  { name: "Boutique en ligne", price: 1790, inst: "ou 3 × 597 € sans frais", feats: ["30 produits mis en ligne", "Paiement et livraison réglés", "1 h de prise en main en visio"], note: "+ abonnement Shopify (≈ 30 à 40 € / mois)" },
];
const PricesScene: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <div style={{ ...center, top: 170 }}>
        <BlurWords text="Deux formules," t={lt} at={0.1} size={92} gradient />
      </div>
      <div style={{ ...center, top: 272 }}>
        <BlurWords text="un prix fixe." t={lt} at={0.3} size={92} gradient />
      </div>
      {PLANS.map((p, i) => {
        const a = 0.6 + i * 0.6;
        const s = sp(lt, a, fps, { damping: 16, stiffness: 110, mass: 0.9 });
        const n = tw(lt, [a + 0.15, a + 1.05], [0, p.price], EASE.out);
        const top = 440 + i * 570;
        return (
          <div
            key={p.name}
            style={{
              position: "absolute",
              left: 80,
              right: 80,
              top,
              transform: `perspective(1800px) translateY(${(1 - s) * 200}px) rotateX(${(1 - s) * 25}deg)`,
              opacity: Math.min(1, s * 1.4),
            }}
          >
            <Glass radius={44} glow={i === 0 ? 0.55 * s : 0} tint={i === 0 ? "rgba(0,85,253,0.30)" : "rgba(255,255,255,0.10)"} sheen={tw(lt, [a + 0.5, a + 1.3], [0, 1])} style={{ padding: "40px 54px", height: 535 }}>
              <div style={txt(40, 600, G.ink)}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }}>
                <span style={{ ...txt(140, 700, "#fff"), letterSpacing: "-0.045em", lineHeight: 1.05 }}>{fmt(n)} €</span>
              </div>
              <div style={{ ...txt(32, 500, G.sky), marginTop: 2 }}>{p.inst}</div>
              <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
                {p.feats.map((f, j) => {
                  const fa = tw(lt, [a + 0.6 + j * 0.12, a + 0.9 + j * 0.12], [0, 1]);
                  return (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 18, opacity: fa, transform: `translateX(${(1 - fa) * 30}px)` }}>
                      <CheckDot size={36} />
                      <span style={txt(30, 500, G.ink)}>{f}</span>
                    </div>
                  );
                })}
              </div>
              {p.note && <div style={{ ...txt(24, 500, G.muted), marginTop: 18, opacity: tw(lt, [a + 1.0, a + 1.3], [0, 1]) }}>{p.note}</div>}
            </Glass>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 80, right: 80, top: 1595, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18 }}>
        <Chip t={lt} at={3.2} label="Tag NFC offert" size={30} active={0.6} />
        <Chip t={lt} at={3.35} label="Nom de domaine offert la 1re année" size={30} />
        <Chip t={lt} at={3.5} label="Hébergement inclus" size={30} />
        <Chip t={lt} at={3.65} label="1 mois de retouches" size={30} />
      </div>
    </>
  );
};

// ───────────────────────── 6. Comparatif
const BARS = [
  { label: "Site par abonnement (49 € / mois)", v: 1800, txt: "≈ 1 800 €" },
  { label: "Agence web + maintenance", v: 2000, txt: "2 000 € et +" },
  { label: "Frais d'entrée 400 € + 60 € / mois", v: 2500, txt: "≈ 2 500 €" },
  { label: "ReviewMaker · Site vitrine", v: 990, txt: "990 €", me: true },
];
const CompareScene: React.FC<{ lt: number }> = ({ lt }) => {
  const maxW = 620;
  return (
    <>
      <div style={{ ...center, top: 260 }}>
        <BlurWords text="Sur 3 ans," t={lt} at={0.1} size={100} gradient />
      </div>
      <div style={{ ...center, top: 370 }}>
        <BlurWords text="faites le calcul." t={lt} at={0.3} size={100} gradient />
      </div>
      <div style={{ ...center, top: 520, padding: "0 140px" }}>
        <BlurWords text="Un prix fixe, payé une fois. Le site et le domaine sont à votre nom." t={lt} at={0.55} size={34} weight={500} color={G.muted} stagger={0.03} spacing={-0.01} />
      </div>
      {BARS.map((b, i) => {
        const a = b.me ? 1.7 : 0.7 + i * 0.2;
        const g = tw(lt, [a, a + 0.75], [0, 1], EASE.out);
        const top = 720 + i * 210 + (b.me ? 30 : 0);
        return (
          <div key={b.label} style={{ position: "absolute", left: 90, top, opacity: tw(lt, [a - 0.1, a + 0.2], [0, 1]) }}>
            <div style={{ ...txt(30, b.me ? 600 : 500, b.me ? "#fff" : G.muted), marginBottom: 14 }}>{b.label}</div>
            <div style={{ position: "relative", height: 96, width: maxW }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: 96,
                  width: Math.max(96, (b.v / 2500) * maxW * g),
                }}
              >
                <Glass
                  radius={48}
                  glow={b.me ? g : 0}
                  tint={b.me ? "rgba(0,85,253,0.7)" : "rgba(255,255,255,0.12)"}
                  sheen={b.me ? tw(lt, [a + 0.5, a + 1.2], [0, 1]) : -1}
                  style={{ height: 96 }}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  height: 96,
                  display: "flex",
                  alignItems: "center",
                  left: Math.max(96, (b.v / 2500) * maxW * g) + 22,
                  ...txt(b.me ? 54 : 40, 700, b.me ? "#fff" : G.ink),
                  letterSpacing: "-0.03em",
                  whiteSpace: "nowrap",
                  opacity: tw(lt, [a + 0.4, a + 0.7], [0, 1]),
                }}
              >
                {b.txt}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ ...center, top: 1640, padding: "0 140px" }}>
        <div style={{ ...txt(24, 500, "rgba(226,234,255,0.45)"), textAlign: "center", opacity: tw(lt, [2.2, 2.6], [0, 1]) }}>
          Estimations à partir de tarifs publics d'offres par abonnement et d'agences web, constatés en octobre 2026.
        </div>
      </div>
    </>
  );
};

// ───────────────────────── 7. Tag NFC
const TagScene: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  const enter = sp(lt, 0.3, fps, { damping: 16, stiffness: 80, mass: 1 });
  const tap = 1.95;
  const phone = tw(lt, [1.2, tap], [0, 1], EASE.out) * (1 - tw(lt, [tap + 0.35, tap + 1.0], [0, 0.35], EASE.inOut));
  const ry = Math.sin(lt * 0.9) * 10 - 6;
  const stars = sp(lt, tap + 0.45, fps, { damping: 13, stiffness: 140, mass: 0.8 });
  return (
    <>
      <div style={{ ...center, top: 190 }}>
        <BlurWords text="Et pour vos avis Google" t={lt} at={0.1} size={40} weight={600} color={G.sky} spacing={-0.01} />
      </div>
      <div style={{ ...center, top: 270 }}>
        <BlurWords text="Le tag NFC qui" t={lt} at={0.25} size={92} gradient />
      </div>
      <div style={{ ...center, top: 372 }}>
        <BlurWords text="récolte vos avis." t={lt} at={0.45} size={92} gradient />
      </div>
      {/* ondes NFC */}
      {[0, 1, 2].map((k) => {
        const u = tw(lt, [tap + k * 0.18, tap + 0.9 + k * 0.18], [0, 1], (x) => x);
        if (u <= 0 || u >= 1) return null;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: 540 - 300 * (0.5 + u),
              top: 1000 - 300 * (0.5 + u),
              width: 600 * (0.5 + u),
              height: 600 * (0.5 + u),
              borderRadius: "50%",
              border: `${6 * (1 - u) + 1}px solid rgba(143,184,255,${1 - u})`,
              boxShadow: `0 0 40px rgba(0,85,253,${0.8 * (1 - u)})`,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 540 - 290,
          top: 1000 - 290,
          width: 580,
          height: 580,
          transform: `perspective(1600px) translateY(${(1 - enter) * 300}px) rotateY(${ry}deg) rotateX(${8 + (1 - enter) * 30}deg) scale(${lerp(0.7, 1, enter) * (1 - 0.04 * tw(lt, [tap - 0.05, tap + 0.1], [0, 1]) + 0.04 * tw(lt, [tap + 0.1, tap + 0.4], [0, 1]))})`,
          opacity: Math.min(1, enter * 1.4),
          filter: "drop-shadow(0 50px 60px rgba(0,0,20,0.6))",
        }}
      >
        <Img src={staticFile("rm26/rm26-tag-detoure.png")} style={{ width: 500, height: 516, margin: "32px 40px" }} />
      </div>
      {/* téléphone en verre qui vient toucher le tag */}
      <div
        style={{
          position: "absolute",
          left: lerp(1150, 610, phone),
          top: lerp(1250, 840, phone),
          width: 300,
          height: 600,
          transform: `rotate(${lerp(30, 14, phone)}deg)`,
          opacity: tw(lt, [1.1, 1.4], [0, 1]) * (1 - tw(lt, [tap + 0.8, tap + 1.2], [0, 1])),
        }}
      >
        <Glass radius={54} style={{ width: 300, height: 600 }} tint="rgba(255,255,255,0.16)">
          <div style={{ position: "absolute", top: 22, left: 110, width: 80, height: 22, borderRadius: 11, background: "rgba(0,0,0,0.45)" }} />
        </Glass>
      </div>
      {/* carte avis */}
      <div style={{ ...center, top: 1380 }}>
        <div style={{ transform: `scale(${lerp(0.6, 1, stars)}) translateY(${(1 - stars) * 40}px)`, opacity: Math.min(1, stars * 1.5) }}>
          <Glass radius={40} glow={0.5 * stars} style={{ padding: "28px 50px" }} sheen={tw(lt, [tap + 0.8, tap + 1.5], [0, 1])}>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {[0, 1, 2, 3, 4].map((k) => {
                const s = sp(lt, tap + 0.6 + k * 0.1, fps, { damping: 10, stiffness: 200, mass: 0.6 });
                return <Star key={k} size={64} style={{ transform: `scale(${s}) rotate(${(1 - s) * -60}deg)` }} />;
              })}
            </div>
            <div style={{ ...txt(30, 500, G.ink), textAlign: "center", marginTop: 12 }}>La page d'avis s'ouvre, sans appli.</div>
          </Glass>
        </div>
      </div>
      <div style={{ ...center, top: 1640, gap: 18 }}>
        <Chip t={lt} at={2.9} label="35 € · livraison offerte" size={32} active={0.6} />
        <Chip t={lt} at={3.05} label="Garantie à vie" size={32} />
      </div>
    </>
  );
};

// ───────────────────────── 8. Appel à l'action
const CtaScene: React.FC<{ lt: number }> = ({ lt }) => {
  const { fps } = useVideoConfig();
  const pop = sp(lt, 0.05, fps, { damping: 13, stiffness: 120, mass: 0.9 });
  const btn = sp(lt, 0.9, fps, { damping: 13, stiffness: 150, mass: 0.8 });
  const press = 1.55;
  const pr = tw(lt, [press - 0.08, press], [0, 1]) * (1 - tw(lt, [press + 0.05, press + 0.3], [0, 1]));
  const ring = tw(lt, [press, press + 0.8], [0, 1], (x) => x);
  return (
    <>
      <div style={{ ...center, top: 440 }}>
        <div style={{ transform: `perspective(1400px) rotateX(${(1 - pop) * 25}deg) scale(${lerp(0.6, 1, pop)})`, opacity: Math.min(1, pop * 1.6) }}>
          <AppIcon size={250} sheen={tw(lt, [0.5, 1.3], [0, 1])} />
        </div>
      </div>
      <div style={{ ...center, top: 760 }}>
        <BlurWords text="Voyez votre site" t={lt} at={0.25} size={96} gradient />
      </div>
      <div style={{ ...center, top: 866 }}>
        <BlurWords text="avant de payer." t={lt} at={0.45} size={96} gradient />
      </div>
      <div style={{ ...center, top: 1090 }}>
        <div style={{ position: "relative", transform: `scale(${lerp(0.6, 1, btn) * (1 - 0.05 * pr)})`, opacity: Math.min(1, btn * 1.5) }}>
          {ring > 0 && ring < 1 && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 820 * (1 + 0.25 * ring),
                height: 170 * (1 + 0.8 * ring),
                transform: "translate(-50%,-50%)",
                borderRadius: 999,
                border: `3px solid rgba(143,184,255,${1 - ring})`,
              }}
            />
          )}
          <Glass radius={999} glow={0.9 * btn + pr * 0.6} tint="rgba(0,85,253,0.75)" sheen={tw(lt, [1.0, 1.7], [0, 1])} style={{ padding: "40px 80px" }}>
            <div style={{ ...txt(44, 600, "#fff"), whiteSpace: "nowrap" }}>Demander mon aperçu gratuit</div>
          </Glass>
        </div>
      </div>
      <div style={{ ...center, top: 1350 }}>
        <div style={{ opacity: tw(lt, [1.9, 2.4], [0, 1]), filter: `blur(${tw(lt, [1.9, 2.5], [14, 0])}px)`, ...txt(64, 600, "#fff"), letterSpacing: "-0.03em" }}>reviewmaker.fr</div>
      </div>
      <div style={{ ...center, top: 1450 }}>
        <div style={{ opacity: tw(lt, [2.2, 2.7], [0, 1]), ...txt(32, 500, G.muted) }}>Devis gratuit · Sans engagement · Réponse sous 48 h</div>
      </div>
    </>
  );
};

export const GlassPromo: React.FC = () => {
  const t = useT();
  const fadeOut = tw(t, [GLASS_DURATION - 0.6, GLASS_DURATION], [0, 1], EASE.in);
  const fadeIn = tw(t, [0, 0.5], [0, 1]);
  return (
    <AbsoluteFill style={{ background: G.bg }}>
      <Aurora t={t} />
      <Scene t={t} from={S.logo[0]} to={S.logo[1]} inD={0.01}>{(lt) => <LogoScene lt={lt} />}</Scene>
      <Scene t={t} from={S.hook[0]} to={S.hook[1]}>{(lt) => <HookScene lt={lt} />}</Scene>
      <Scene t={t} from={S.sites[0]} to={S.sites[1]}>{(lt) => <SitesScene lt={lt} />}</Scene>
      <Scene t={t} from={S.steps[0]} to={S.steps[1]}>{(lt) => <StepsScene lt={lt} />}</Scene>
      <Scene t={t} from={S.prices[0]} to={S.prices[1]}>{(lt) => <PricesScene lt={lt} />}</Scene>
      <Scene t={t} from={S.compare[0]} to={S.compare[1]}>{(lt) => <CompareScene lt={lt} />}</Scene>
      <Scene t={t} from={S.tag[0]} to={S.tag[1]}>{(lt) => <TagScene lt={lt} />}</Scene>
      <Scene t={t} from={S.cta[0]} to={S.cta[1]} outD={0.01}>{(lt) => <CtaScene lt={lt} />}</Scene>
      <Grain t={t} />
      <AbsoluteFill style={{ background: "#000", opacity: (1 - fadeIn) + fadeOut, pointerEvents: "none" }} />
      <Audio src={staticFile("glass/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
