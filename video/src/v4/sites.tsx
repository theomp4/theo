// Cinq sites d'exemple (commerces fictifs) VIVANTS : animation de chargement, widget interactif,
// curseur qui clique, défilement avec parallaxe. Ordinateur : 1280 × 800. Mobile : 390 × 844.
// `t0` = instant (s) où la page « se charge » ; laissé par défaut, le site est déjà affiché.
import React from "react";
import { E, Photo, tw, useT } from "./core";

export type SiteId = "resto" | "salon" | "garage" | "fournil" | "fleurs";

const SERIF = "'Playfair Display', serif";
const CORM = "'Cormorant Garamond', serif";
const SANS = "'DM Sans', sans-serif";
const BEBAS = "'Bebas Neue', sans-serif";

type Theme = {
  name: string;
  bg: string;
  fg: string;
  sub: string;
  accent: string;
  accentFg: string;
  card: string;
  display: string;
  displayWeight: number;
  upper?: boolean;
  photo: string;
  photos: string[];
  kicker: string;
  title: [string, string];
  italic2?: boolean;
  text: string;
  cta: string;
  nav: string[];
};

export const THEMES: Record<SiteId, Theme> = {
  resto: {
    name: "Maison Lumière",
    bg: "#0E0C0A",
    fg: "#F4EBDD",
    sub: "rgba(244,235,221,0.65)",
    accent: "#C9A15B",
    accentFg: "#0E0C0A",
    card: "rgba(24,20,16,0.92)",
    display: SERIF,
    displayWeight: 500,
    photo: "dish",
    photos: ["interior", "food", "resto2"],
    kicker: "Cuisine de saison",
    title: ["L'art de", "recevoir."],
    italic2: true,
    text: "Une table d'exception, des produits du marché et un service aux petits soins.",
    cta: "Réserver une table",
    nav: ["La carte", "Le chef", "Événements"],
  },
  salon: {
    name: "Atelier Rose",
    bg: "#F7EFEA",
    fg: "#2B1D1D",
    sub: "rgba(43,29,29,0.62)",
    accent: "#B8666A",
    accentFg: "#fff",
    card: "#FFFFFF",
    display: CORM,
    displayWeight: 600,
    photo: "hair",
    photos: ["salon", "hair", "barber"],
    kicker: "Coupe · Couleur · Soin",
    title: ["Révélez", "votre éclat."],
    italic2: true,
    text: "Un salon intimiste où chaque coupe est pensée pour vous.",
    cta: "Prendre rendez-vous",
    nav: ["Prestations", "L'équipe", "Tarifs"],
  },
  garage: {
    name: "DELTA AUTO",
    bg: "#0B0B0C",
    fg: "#FFFFFF",
    sub: "rgba(255,255,255,0.6)",
    accent: "#FF5A1F",
    accentFg: "#fff",
    card: "rgba(20,20,22,0.9)",
    display: BEBAS,
    displayWeight: 400,
    upper: true,
    photo: "car",
    photos: ["engine", "car", "engine"],
    kicker: "Entretien · Carrosserie · Diagnostic",
    title: ["Votre auto", "entre de bonnes mains"],
    text: "Mécanicien de quartier, matériel de pro. On s'occupe de tout.",
    cta: "Prendre RDV",
    nav: ["Services", "Atelier", "Contact"],
  },
  fournil: {
    name: "Le Fournil",
    bg: "#F3E9DC",
    fg: "#3A2416",
    sub: "rgba(58,36,22,0.62)",
    accent: "#7A4B2A",
    accentFg: "#F3E9DC",
    card: "#FFFDF8",
    display: SERIF,
    displayWeight: 700,
    photo: "bread",
    photos: ["bread", "food", "bread"],
    kicker: "Boulangerie artisanale",
    title: ["Le pain,", "comme avant."],
    text: "Levain naturel, farines locales et cuisson chaque matin.",
    cta: "Commander",
    nav: ["Nos pains", "Pâtisseries", "Horaires"],
  },
  fleurs: {
    name: "Fleurs de Lune",
    bg: "#10302A",
    fg: "#F6EADF",
    sub: "rgba(246,234,223,0.68)",
    accent: "#F2B9A0",
    accentFg: "#10302A",
    card: "rgba(16,48,42,0.92)",
    display: CORM,
    displayWeight: 600,
    photo: "flowers",
    photos: ["flowers", "shop", "flowers"],
    kicker: "Artisan fleuriste",
    title: ["Des fleurs", "qui racontent."],
    italic2: true,
    text: "Bouquets de saison composés à la main, livrés le jour même.",
    cta: "Composer un bouquet",
    nav: ["Bouquets", "Mariages", "Atelier"],
  },
};

// ------------------------------------------------------------ petites briques animées

/** progression 0→1 d'une étape de la page, en secondes après le chargement */
const useStep = (t0: number) => {
  const t = useT();
  const u = t - t0;
  return { u, t, p: (a: number, d = 0.45, ease = E.expo) => tw(u, [a, a + d], [0, 1], ease) };
};

const Rise: React.FC<{ p: number; dist?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ p, dist = 36, children, style }) => (
  <div style={{ opacity: p, transform: `translateY(${(1 - p) * dist}px)`, filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined, ...style }}>{children}</div>
);

const Line: React.FC<{ p: number; children: React.ReactNode }> = ({ p, children }) => (
  <div style={{ overflow: "hidden", paddingBottom: "0.06em" }}>
    <div style={{ transform: `translateY(${(1 - p) * 105}%)` }}>{children}</div>
  </div>
);

const Btn: React.FC<{ th: Theme; children: React.ReactNode; ghost?: boolean; size?: number; hover?: number; style?: React.CSSProperties }> = ({ th, children, ghost, size = 18, hover = 0, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: `${size * 0.85}px ${size * 1.6}px`,
      borderRadius: th.upper ? 4 : 999,
      background: ghost ? "transparent" : th.accent,
      color: ghost ? th.fg : th.accentFg,
      border: ghost ? `1.5px solid ${th.sub}` : "none",
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: th.upper ? 1.5 : 0,
      textTransform: th.upper ? "uppercase" : "none",
      whiteSpace: "nowrap",
      transform: `translateY(${-hover * 3}px) scale(${1 + hover * 0.04})`,
      boxShadow: hover > 0 ? `0 ${12 * hover}px ${30 * hover}px -8px ${th.accent}` : "none",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

const Check: React.FC<{ color: string; size?: number }> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Kicker: React.FC<{ th: Theme; p: number }> = ({ th, p }) => (
  <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: th.accent, display: "flex", alignItems: "center", gap: 14, opacity: Math.min(1, p * 2) }}>
    <span style={{ width: 36 * p, height: 2, background: th.accent }} />
    {th.kicker}
  </div>
);

const Title: React.FC<{ th: Theme; size: number; p1: number; p2: number; align?: "left" | "center" }> = ({ th, size, p1, p2, align = "left" }) => (
  <div style={{ fontFamily: th.display, fontWeight: th.displayWeight, fontSize: size, lineHeight: th.upper ? 0.92 : 1.0, color: th.fg, textAlign: align, textTransform: th.upper ? "uppercase" : "none", letterSpacing: th.upper ? 1 : -1 }}>
    <Line p={p1}>{th.title[0]}</Line>
    <Line p={p2}>
      <span style={{ fontStyle: th.italic2 ? "italic" : "normal", color: th.accent }}>{th.title[1]}</span>
    </Line>
  </div>
);

const Nav: React.FC<{ th: Theme; p: number; cart?: number }> = ({ th, p, cart = 0 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 92, display: "flex", alignItems: "center", padding: "0 64px", justifyContent: "space-between", zIndex: 5, opacity: p, transform: `translateY(${(1 - p) * -24}px)` }}>
    <div style={{ fontFamily: th.display, fontWeight: th.displayWeight + 100, fontSize: th.upper ? 38 : 30, color: th.fg, letterSpacing: th.upper ? 3 : 0 }}>{th.name}</div>
    <div style={{ display: "flex", gap: 40, fontFamily: SANS, fontSize: 16, fontWeight: 500, color: th.fg, opacity: 0.85 }}>
      {th.nav.map((n) => (
        <span key={n}>{n}</span>
      ))}
    </div>
    <div style={{ position: "relative" }}>
      <Btn th={th} size={15}>
        {cart > 0 ? "Panier" : th.cta}
      </Btn>
      {cart > 0 && (
        <div style={{ position: "absolute", right: -8, top: -8, width: 26, height: 26, borderRadius: 13, background: "#E2483D", color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${cart})` }}>1</div>
      )}
    </div>
  </div>
);

/** Rangée de photos sous le pli ; chaque carte se révèle quand on défile */
const Gallery: React.FC<{ th: Theme; scroll: number }> = ({ th, scroll }) => (
  <div style={{ position: "absolute", left: 64, right: 64, top: 860, display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 24, height: 340 }}>
    {th.photos.map((p, i) => {
      const r = Math.max(0, Math.min(1, (scroll - 40 - i * 45) / 130));
      return (
        <div key={i} style={{ position: "relative", borderRadius: th.upper ? 4 : 22, overflow: "hidden", opacity: r, transform: `translateY(${(1 - r) * 80}px) scale(${0.94 + r * 0.06})` }}>
          <Photo src={p} style={{ position: "absolute", inset: 0 }} zoom={1.15 - r * 0.08} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.55), transparent 50%)" }} />
          <div style={{ position: "absolute", left: 22, bottom: 18, fontFamily: SANS, fontWeight: 700, fontSize: 20, color: "#fff" }}>{th.nav[i]}</div>
        </div>
      );
    })}
  </div>
);

// ------------------------------------------------------------ curseur + démonstration

export const DEMO = {
  appear: 0.5, // le widget arrive
  move: [0.6, 0.98] as [number, number], // le curseur va sur la cible
  click: 1.05,
  scroll: [1.22, 1.9] as [number, number],
};

const TARGET: Partial<Record<SiteId, { x: number; y: number }>> = {
  resto: { x: 1020, y: 645 },
  salon: { x: 702, y: 740 },
  garage: { x: 1030, y: 645 },
  fournil: { x: 330, y: 724 },
};

const Cursor: React.FC<{ id: SiteId; u: number }> = ({ id, u }) => {
  const tg = TARGET[id];
  if (!tg || u < DEMO.move[0] - 0.1) return null;
  const m = tw(u, DEMO.move, [0, 1], E.inOut);
  const leave = tw(u, [DEMO.click + 0.25, DEMO.click + 0.7], [0, 1], E.inOut);
  const x = 1180 + (tg.x - 1180) * m + leave * 90;
  const y = 880 + (tg.y - 880) * m + leave * 70 - Math.sin(m * Math.PI) * 60;
  const press = u > DEMO.click && u < DEMO.click + 0.12 ? 0.82 : 1;
  const ripple = tw(u, [DEMO.click, DEMO.click + 0.5], [0, 1]);
  return (
    <>
      {u > DEMO.click && ripple < 1 && (
        <div style={{ position: "absolute", left: tg.x - 50, top: tg.y - 50, width: 100, height: 100, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.9)", boxShadow: "0 0 20px rgba(255,255,255,0.6)", opacity: 1 - ripple, transform: `scale(${0.3 + ripple * 1.2})`, zIndex: 20 }} />
      )}
      <svg width="44" height="44" viewBox="0 0 24 24" style={{ position: "absolute", left: x - 6, top: y - 3, transform: `scale(${press})`, transformOrigin: "6px 3px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))", zIndex: 21, opacity: tw(u, [DEMO.move[0] - 0.1, DEMO.move[0]], [0, 1]) }}>
        <path d="M4 2l15 9.5-6.6 1.3 3.9 7.4-2.9 1.5-3.9-7.4L4 19z" fill="#fff" stroke="#111" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  );
};

const Chip: React.FC<{ th: Theme; on?: number; children: React.ReactNode; size?: number }> = ({ th, on = 0, children, size = 16 }) => (
  <div
    style={{
      padding: `${size * 0.55}px ${size * 0.95}px`,
      borderRadius: th.upper ? 4 : 999,
      border: `1.5px solid ${on > 0.5 ? th.accent : th.sub}`,
      background: on > 0.5 ? th.accent : "transparent",
      color: on > 0.5 ? th.accentFg : th.fg,
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: size,
      transform: `scale(${1 + Math.sin(Math.min(1, on) * Math.PI) * 0.12})`,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

/** Widget propre à chaque commerce : réservation, créneaux, rendez-vous, panier */
const Widget: React.FC<{ id: SiteId; th: Theme; u: number; demo: boolean }> = ({ id, th, u, demo }) => {
  const p = demo ? tw(u, [DEMO.appear, DEMO.appear + 0.4], [0, 1], E.back) : 1;
  const hover = demo ? tw(u, [DEMO.move[1] - 0.12, DEMO.move[1]], [0, 1]) * (1 - tw(u, [DEMO.click + 0.3, DEMO.click + 0.5], [0, 1])) : 0;
  const done = demo ? tw(u, [DEMO.click + 0.05, DEMO.click + 0.3], [0, 1], E.back) : 0;
  const card = (x: number, y: number, w: number, children: React.ReactNode, extra?: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        padding: 22,
        boxSizing: "border-box",
        borderRadius: th.upper ? 6 : 22,
        background: th.card,
        border: `1px solid ${th.upper || id === "resto" ? `${th.accent}55` : "rgba(0,0,0,0.06)"}`,
        boxShadow: "0 30px 60px -20px rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * 40}px) scale(${0.92 + p * 0.08})`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        zIndex: 6,
        ...extra,
      }}
    >
      {children}
    </div>
  );
  const confirmBtn = (label: string, doneLabel: string) => (
    <Btn th={th} size={17} hover={hover} style={{ width: "100%", background: done > 0.5 ? "#2FA866" : th.accent, color: done > 0.5 ? "#fff" : th.accentFg }}>
      {done > 0.5 ? (
        <>
          <Check color="#fff" /> {doneLabel}
        </>
      ) : (
        label
      )}
    </Btn>
  );
  if (id === "resto")
    return card(
      830,
      500,
      380,
      <>
        <div style={{ fontFamily: SERIF, fontSize: 26, color: th.fg }}>Réserver une table</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Chip th={th} on={1}>
            Ce soir
          </Chip>
          <Chip th={th}>20:00</Chip>
          <Chip th={th}>2 pers.</Chip>
        </div>
        {confirmBtn("Confirmer", "Table réservée")}
      </>,
    );
  if (id === "salon") {
    const pick = demo ? tw(u, [DEMO.click, DEMO.click + 0.25], [0, 1]) : 0;
    return card(
      640,
      660,
      380,
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#3BB273", boxShadow: `0 0 0 ${4 + Math.sin(u * 8) * 3}px rgba(59,178,115,0.25)` }} />
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 18, color: th.fg }}>{done > 0.5 ? "Rendez-vous confirmé" : "Disponible aujourd'hui"}</div>
          {done > 0.5 && <Check color="#2FA866" />}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Chip th={th} on={pick}>
            14:30
          </Chip>
          <Chip th={th}>15:00</Chip>
          <Chip th={th}>16:30</Chip>
          <Chip th={th}>17:00</Chip>
        </div>
      </>,
      { gap: 16 },
    );
  }
  if (id === "garage")
    return card(
      840,
      460,
      380,
      <>
        <div style={{ fontFamily: BEBAS, fontSize: 36, color: th.fg, letterSpacing: 1.5 }}>Prendre rendez-vous</div>
        {[
          ["Prestation", "Vidange + filtres"],
          ["Créneau", "Jeudi · 9h00"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 16, color: th.sub, borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: 10 }}>
            <span>{k}</span>
            <span style={{ color: th.fg, fontWeight: 700 }}>{v}</span>
          </div>
        ))}
        {confirmBtn("Valider", "C'est noté")}
      </>,
    );
  if (id === "fournil") {
    return (
      <div style={{ position: "absolute", left: 110, top: 600, display: "flex", gap: 24, zIndex: 6 }}>
        {[
          ["Pain au levain", "4,20 €", "bread"],
          ["Croissant", "1,30 €", "food"],
          ["Tarte du jour", "3,80 €", "bread"],
        ].map(([n, pr, ph], i) => {
          const q = demo ? tw(u, [DEMO.appear + i * 0.08, DEMO.appear + 0.4 + i * 0.08], [0, 1], E.back) : 1;
          const added = i === 0 ? done : 0;
          return (
            <div key={n} style={{ width: 330, height: 160, borderRadius: 22, background: th.card, boxShadow: "0 24px 50px -20px rgba(58,36,22,0.45)", display: "flex", gap: 16, padding: 16, boxSizing: "border-box", opacity: Math.min(1, q * 1.5), transform: `translateY(${(1 - q) * 50}px) rotateX(${(1 - q) * 40}deg)` }}>
              <Photo src={ph} style={{ width: 128, height: 128, borderRadius: 16, flexShrink: 0 }} zoom={1.1} />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
                <div>
                  <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: th.fg }}>{n}</div>
                  <div style={{ fontFamily: SANS, fontSize: 17, color: th.sub, marginTop: 4 }}>{pr}</div>
                </div>
                <Btn th={th} size={14} hover={i === 0 ? hover : 0} style={{ background: added > 0.5 ? "#2FA866" : th.accent, color: added > 0.5 ? "#fff" : th.accentFg }}>
                  {added > 0.5 ? (
                    <>
                      <Check color="#fff" size={16} /> Ajouté
                    </>
                  ) : (
                    "Ajouter +"
                  )}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// ------------------------------------------------------------ version ordinateur

export const SiteDesktop: React.FC<{ id: SiteId; scroll?: number; t0?: number; demo?: boolean }> = ({ id, scroll = 0, t0 = -100, demo = false }) => {
  const th = THEMES[id];
  const { u, t, p } = useStep(t0);
  const kb = 1.06 + Math.sin(t * 0.6) * 0.02;
  const photoIn = p(0, 0.8);
  const nav = p(0.05, 0.4);
  const k = p(0.12, 0.5);
  const t1 = p(0.18, 0.55);
  const t2 = p(0.3, 0.55);
  const txt = p(0.42, 0.5);
  const btn = p(0.5, 0.45, E.back);
  const par = scroll * 0.45; // la photo défile moins vite (parallaxe)
  const done = demo ? tw(u, [DEMO.click + 0.05, DEMO.click + 0.3], [0, 1], E.back) : 0;
  const photoStyle = (extra: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    clipPath: `inset(0 0 ${(1 - photoIn) * 100}% 0)`,
    transform: `translateY(${par}px)`,
    ...extra,
  });
  const textBlock = (top: number, width: number, size: number, left = 64, align: "left" | "center" = "left", ghost = th.nav[0]) => (
    <div style={{ position: "absolute", left, top, width, display: "flex", flexDirection: "column", gap: 26, alignItems: align === "center" ? "center" : "flex-start" }}>
      <Kicker th={th} p={k} />
      <Title th={th} size={size} p1={t1} p2={t2} align={align} />
      <Rise p={txt}>
        <div style={{ fontFamily: SANS, fontSize: 19, lineHeight: 1.55, color: th.sub, width: Math.min(width, 470), textAlign: align }}>{th.text}</div>
      </Rise>
      <div style={{ display: "flex", gap: 16, transform: `scale(${0.85 + btn * 0.15})`, opacity: Math.min(1, btn * 1.5), transformOrigin: "left center" }}>
        <Btn th={th}>{th.cta} →</Btn>
        {ghost && (
          <Btn th={th} ghost>
            {ghost}
          </Btn>
        )}
      </div>
    </div>
  );
  let hero: React.ReactNode;
  if (id === "resto" || id === "garage") {
    hero = (
      <>
        <div style={photoStyle({ left: id === "resto" ? 480 : 0, right: 0, top: 0, height: 800 })}>
          <Photo src={th.photo} style={{ position: "absolute", inset: 0 }} zoom={kb + (1 - photoIn) * 0.2} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            height: 800,
            background:
              id === "resto"
                ? `linear-gradient(90deg, ${th.bg} 36%, rgba(14,12,10,0.55) 55%, rgba(14,12,10,0.1) 80%)`
                : "linear-gradient(90deg, rgba(11,11,12,0.92) 30%, rgba(11,11,12,0.35) 75%), linear-gradient(0deg, rgba(11,11,12,0.9) 0%, transparent 40%)",
          }}
        />
        {id === "garage" && <div style={{ position: "absolute", left: 0, top: 150, height: 6, width: 1280 * p(0.1, 0.6), background: th.accent }} />}
        {textBlock(id === "resto" ? 200 : 190, 680, id === "resto" ? 96 : 128)}
      </>
    );
  } else if (id === "salon") {
    hero = (
      <>
        <div style={photoStyle({ left: 64, top: 120, width: 500, height: 640, borderRadius: "250px 250px 28px 28px", overflow: "hidden" })}>
          <Photo src={th.photo} style={{ position: "absolute", inset: 0 }} zoom={kb + (1 - photoIn) * 0.2} pos="50% 30%" />
        </div>
        {textBlock(200, 560, 112, 640, "left", "")}
      </>
    );
  } else if (id === "fournil") {
    hero = (
      <>
        <div style={photoStyle({ left: 640, top: 110, width: 576, height: 440, borderRadius: 30, overflow: "hidden" })}>
          <Photo src={th.photo} style={{ position: "absolute", inset: 0 }} zoom={kb + (1 - photoIn) * 0.2} />
        </div>
        {textBlock(140, 560, 92, 64, "left", "")}
      </>
    );
  } else {
    hero = (
      <>
        <div style={photoStyle({ right: 0, top: 0, width: 640, height: 800 })}>
          <Photo src={th.photo} style={{ position: "absolute", inset: 0 }} zoom={kb + (1 - photoIn) * 0.2} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${th.bg} 0%, transparent 35%)` }} />
        </div>
        {textBlock(210, 600, 110, 64, "left", th.nav[1])}
      </>
    );
  }
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1280, height: 800, background: th.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1300, transform: `translateY(${-scroll}px)` }}>
        {hero}
        <Widget id={id} th={th} u={u} demo={demo} />
        <Gallery th={th} scroll={demo || t0 > -50 ? scroll : 400} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 92, background: th.bg, opacity: Math.min(1, scroll / 60) }} />
      <Nav th={th} p={nav} cart={id === "fournil" ? done : 0} />
      {demo && (
        <div style={{ position: "absolute", left: 0, top: 0, transform: `translateY(0px)` }}>
          <Cursor id={id} u={u} />
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------ version mobile

export const SiteMobile: React.FC<{ id: SiteId; scroll?: number; width?: number; t0?: number }> = ({ id, scroll = 0, width = 390, t0 = -100 }) => {
  const th = THEMES[id];
  const { t, p } = useStep(t0);
  const kb = 1.08 + Math.sin(t * 0.7) * 0.03;
  const pad = width > 500 ? 48 : 26;
  const photoIn = p(0.05, 0.8);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: 1400, background: th.bg, overflow: "hidden" }}>
      <div style={{ transform: `translateY(${-scroll}px)` }}>
        <div style={{ height: 64 }} />
        <Rise p={p(0.1, 0.4)} dist={-20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `0 ${pad}px` }}>
            <div style={{ fontFamily: th.display, fontWeight: th.displayWeight + 100, fontSize: th.upper ? 30 : 24, color: th.fg, letterSpacing: th.upper ? 2 : 0 }}>{th.name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 24, height: 2.5, background: th.fg, borderRadius: 2 }} />
              ))}
            </div>
          </div>
        </Rise>
        <div style={{ margin: `22px ${pad}px 0`, height: width > 500 ? 420 : 330, borderRadius: th.upper ? 6 : 26, overflow: "hidden", position: "relative", clipPath: `inset(0 0 ${(1 - photoIn) * 100}% 0 round ${th.upper ? 6 : 26}px)` }}>
          <Photo src={th.photo} style={{ position: "absolute", inset: 0, transform: `translateY(${scroll * 0.25}px)` }} zoom={kb + (1 - photoIn) * 0.2} pos={id === "salon" ? "50% 25%" : "center"} />
        </div>
        <div style={{ padding: `28px ${pad}px 0`, display: "flex", flexDirection: "column", gap: 18 }}>
          <Kicker th={th} p={p(0.25, 0.5)} />
          <Title th={th} size={th.upper ? (width > 500 ? 92 : 70) : width > 500 ? 74 : 54} p1={p(0.3, 0.55)} p2={p(0.42, 0.55)} />
          <Rise p={p(0.55, 0.5)}>
            <div style={{ fontFamily: SANS, fontSize: width > 500 ? 18 : 16, lineHeight: 1.5, color: th.sub }}>{th.text}</div>
          </Rise>
          <Rise p={p(0.62, 0.45, E.back)}>
            <Btn th={th} size={width > 500 ? 18 : 16}>
              {th.cta} →
            </Btn>
          </Rise>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: `30px ${pad}px` }}>
          {th.photos.slice(0, 2).map((ph, i) => (
            <div key={i} style={{ height: width > 500 ? 260 : 180, borderRadius: th.upper ? 4 : 18, overflow: "hidden", position: "relative" }}>
              <Photo src={ph} style={{ position: "absolute", inset: 0 }} zoom={1.05} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
