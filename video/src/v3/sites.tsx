// Cinq sites d'exemple (commerces fictifs), chacun avec sa propre identité.
// Version ordinateur : 1280 × 800. Version mobile : 390 × 844.
import React from "react";
import { Photo, useT } from "./core";

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
  mobileTitle: [string, string];
};

export const THEMES: Record<SiteId, Theme> = {
  resto: {
    name: "Maison Lumière",
    bg: "#0E0C0A",
    fg: "#F4EBDD",
    sub: "rgba(244,235,221,0.65)",
    accent: "#C9A15B",
    accentFg: "#0E0C0A",
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
    mobileTitle: ["L'art de", "recevoir."],
  },
  salon: {
    name: "Atelier Rose",
    bg: "#F7EFEA",
    fg: "#2B1D1D",
    sub: "rgba(43,29,29,0.62)",
    accent: "#B8666A",
    accentFg: "#fff",
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
    mobileTitle: ["Révélez", "votre éclat."],
  },
  garage: {
    name: "DELTA AUTO",
    bg: "#0B0B0C",
    fg: "#FFFFFF",
    sub: "rgba(255,255,255,0.6)",
    accent: "#FF5A1F",
    accentFg: "#fff",
    display: BEBAS,
    displayWeight: 400,
    upper: true,
    photo: "car",
    photos: ["engine", "car", "car"],
    kicker: "Entretien · Carrosserie · Diagnostic",
    title: ["Votre auto", "entre de bonnes mains"],
    text: "Mécanicien de quartier, matériel de pro. On s'occupe de tout.",
    cta: "Prendre RDV",
    nav: ["Services", "Atelier", "Contact"],
    mobileTitle: ["Votre auto", "en de bonnes mains"],
  },
  fournil: {
    name: "Le Fournil",
    bg: "#F3E9DC",
    fg: "#3A2416",
    sub: "rgba(58,36,22,0.62)",
    accent: "#7A4B2A",
    accentFg: "#F3E9DC",
    display: SERIF,
    displayWeight: 700,
    photo: "bread",
    photos: ["bread", "food", "bread"],
    kicker: "Boulangerie artisanale",
    title: ["Le pain,", "comme avant."],
    text: "Levain naturel, farines locales et cuisson au feu de bois chaque matin.",
    cta: "Commander",
    nav: ["Nos pains", "Pâtisseries", "Horaires"],
    mobileTitle: ["Le pain,", "comme avant."],
  },
  fleurs: {
    name: "Fleurs de Lune",
    bg: "#10302A",
    fg: "#F6EADF",
    sub: "rgba(246,234,223,0.68)",
    accent: "#F2B9A0",
    accentFg: "#10302A",
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
    mobileTitle: ["Des fleurs", "qui racontent."],
  },
};

const Btn: React.FC<{ th: Theme; children: React.ReactNode; ghost?: boolean; size?: number }> = ({ th, children, ghost, size = 18 }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
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
    }}
  >
    {children}
    {!ghost && <span style={{ fontSize: size * 1.1 }}>→</span>}
  </div>
);

const Nav: React.FC<{ th: Theme; dark?: boolean }> = ({ th }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 92, display: "flex", alignItems: "center", padding: "0 64px", justifyContent: "space-between", zIndex: 5 }}>
    <div style={{ fontFamily: th.display, fontWeight: th.displayWeight + 100, fontSize: th.upper ? 38 : 30, color: th.fg, letterSpacing: th.upper ? 3 : 0 }}>{th.name}</div>
    <div style={{ display: "flex", gap: 40, fontFamily: SANS, fontSize: 16, fontWeight: 500, color: th.fg, opacity: 0.85 }}>
      {th.nav.map((n) => (
        <span key={n}>{n}</span>
      ))}
    </div>
    <Btn th={th} size={15}>
      {th.cta}
    </Btn>
  </div>
);

const Title: React.FC<{ th: Theme; size: number; align?: "left" | "center"; lines?: [string, string] }> = ({ th, size, align = "left", lines }) => {
  const [a, c] = lines ?? th.title;
  return (
    <div style={{ fontFamily: th.display, fontWeight: th.displayWeight, fontSize: size, lineHeight: th.upper ? 0.92 : 1.0, color: th.fg, textAlign: align, textTransform: th.upper ? "uppercase" : "none", letterSpacing: th.upper ? 1 : -1 }}>
      {a}
      <br />
      <span style={{ fontStyle: th.italic2 ? "italic" : "normal", color: th.accent }}>{c}</span>
    </div>
  );
};

const Kicker: React.FC<{ th: Theme }> = ({ th }) => (
  <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: th.accent, display: "flex", alignItems: "center", gap: 14 }}>
    <span style={{ width: 36, height: 2, background: th.accent }} />
    {th.kicker}
  </div>
);

/** Rangée de photos sous le pli (visible quand on fait défiler) */
const Gallery: React.FC<{ th: Theme; k: number }> = ({ th, k }) => (
  <div style={{ position: "absolute", left: 64, right: 64, top: 860, display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 24, height: 340 }}>
    {th.photos.map((p, i) => (
      <div key={i} style={{ position: "relative", borderRadius: th.upper ? 4 : 22, overflow: "hidden" }}>
        <Photo src={p} style={{ position: "absolute", inset: 0 }} zoom={1.08 + Math.sin(k + i) * 0.03} />
        <div style={{ position: "absolute", left: 20, bottom: 18, fontFamily: SANS, fontWeight: 700, fontSize: 18, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>{th.nav[i]}</div>
      </div>
    ))}
  </div>
);

export const SiteDesktop: React.FC<{ id: SiteId; scroll?: number; k?: number }> = ({ id, scroll = 0, k = 0 }) => {
  const th = THEMES[id];
  const t = useT();
  const kb = 1.06 + Math.sin(t * 0.6 + k) * 0.025; // Ken Burns
  let hero: React.ReactNode;
  if (id === "resto" || id === "garage") {
    hero = (
      <>
        <Photo src={th.photo} style={{ position: "absolute", left: id === "resto" ? 480 : 0, right: 0, top: 0, height: 800 }} zoom={kb} />
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
        <div style={{ position: "absolute", left: 64, top: id === "resto" ? 210 : 190, width: 640, display: "flex", flexDirection: "column", gap: 28 }}>
          <Kicker th={th} />
          <Title th={th} size={id === "resto" ? 96 : 132} />
          <div style={{ fontFamily: SANS, fontSize: 19, lineHeight: 1.55, color: th.sub, width: 470 }}>{th.text}</div>
          <div style={{ display: "flex", gap: 16 }}>
            <Btn th={th}>{th.cta}</Btn>
            <Btn th={th} ghost>
              {th.nav[0]}
            </Btn>
          </div>
        </div>
      </>
    );
  } else if (id === "salon") {
    hero = (
      <>
        <div style={{ position: "absolute", left: 64, top: 120, width: 500, height: 640, borderRadius: "250px 250px 28px 28px", overflow: "hidden" }}>
          <Photo src={th.photo} style={{ position: "absolute", inset: 0 }} zoom={kb} pos="50% 30%" />
        </div>
        <div style={{ position: "absolute", left: 640, top: 220, width: 560, display: "flex", flexDirection: "column", gap: 28 }}>
          <Kicker th={th} />
          <Title th={th} size={112} />
          <div style={{ fontFamily: SANS, fontSize: 19, lineHeight: 1.55, color: th.sub, width: 440 }}>{th.text}</div>
          <div style={{ display: "flex", gap: 16 }}>
            <Btn th={th}>{th.cta}</Btn>
          </div>
        </div>
        <div style={{ position: "absolute", left: 470, top: 600, padding: "18px 22px", borderRadius: 18, background: "#fff", boxShadow: "0 20px 40px -12px rgba(43,29,29,0.25)", fontFamily: SANS, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#3BB273" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: th.fg }}>Disponible aujourd'hui</div>
            <div style={{ fontSize: 14, color: th.sub }}>Prochain créneau : 14h30</div>
          </div>
        </div>
      </>
    );
  } else if (id === "fournil") {
    hero = (
      <>
        <div style={{ position: "absolute", left: 64, right: 64, top: 130, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <Kicker th={th} />
          <Title th={th} size={104} align="center" />
        </div>
        <div style={{ position: "absolute", left: 64, right: 64, top: 470, height: 420, borderRadius: 30, overflow: "hidden" }}>
          <Photo src={th.photo} style={{ position: "absolute", inset: 0 }} zoom={kb} />
          <div style={{ position: "absolute", right: 30, bottom: 30 }}>
            <Btn th={th}>{th.cta}</Btn>
          </div>
        </div>
      </>
    );
  } else {
    hero = (
      <>
        <div style={{ position: "absolute", right: 0, top: 0, width: 640, height: 800 }}>
          <Photo src={th.photo} style={{ position: "absolute", inset: 0 }} zoom={kb} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${th.bg} 0%, transparent 35%)` }} />
        </div>
        <div style={{ position: "absolute", left: 64, top: 210, width: 600, display: "flex", flexDirection: "column", gap: 28 }}>
          <Kicker th={th} />
          <Title th={th} size={110} />
          <div style={{ fontFamily: SANS, fontSize: 19, lineHeight: 1.55, color: th.sub, width: 440 }}>{th.text}</div>
          <div style={{ display: "flex", gap: 16 }}>
            <Btn th={th}>{th.cta}</Btn>
            <Btn th={th} ghost>
              {th.nav[1]}
            </Btn>
          </div>
        </div>
      </>
    );
  }
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1280, height: 800, background: th.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1300, transform: `translateY(${-scroll}px)` }}>
        {hero}
        <Gallery th={th} k={k} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 92, background: scroll > 40 ? th.bg : "transparent" }} />
      <Nav th={th} />
    </div>
  );
};

export const SiteMobile: React.FC<{ id: SiteId; scroll?: number; width?: number }> = ({ id, scroll = 0, width = 390 }) => {
  const th = THEMES[id];
  const t = useT();
  const kb = 1.08 + Math.sin(t * 0.7) * 0.03;
  const pad = width > 500 ? 48 : 26;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: 1400, background: th.bg, overflow: "hidden" }}>
      <div style={{ transform: `translateY(${-scroll}px)` }}>
        <div style={{ height: 64 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `0 ${pad}px` }}>
          <div style={{ fontFamily: th.display, fontWeight: th.displayWeight + 100, fontSize: th.upper ? 30 : 24, color: th.fg, letterSpacing: th.upper ? 2 : 0 }}>{th.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 24, height: 2.5, background: th.fg, borderRadius: 2 }} />
            ))}
          </div>
        </div>
        <div style={{ margin: `22px ${pad}px 0`, height: width > 500 ? 420 : 330, borderRadius: th.upper ? 6 : 26, overflow: "hidden", position: "relative" }}>
          <Photo src={th.photo} style={{ position: "absolute", inset: 0 }} zoom={kb} pos={id === "salon" ? "50% 25%" : "center"} />
        </div>
        <div style={{ padding: `28px ${pad}px 0`, display: "flex", flexDirection: "column", gap: 18 }}>
          <Kicker th={th} />
          <Title th={th} size={th.upper ? (width > 500 ? 92 : 70) : width > 500 ? 74 : 54} lines={th.mobileTitle} />
          <div style={{ fontFamily: SANS, fontSize: width > 500 ? 18 : 16, lineHeight: 1.5, color: th.sub }}>{th.text}</div>
          <div>
            <Btn th={th} size={width > 500 ? 18 : 16}>
              {th.cta}
            </Btn>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: `30px ${pad}px` }}>
          {th.photos.slice(0, 2).map((p, i) => (
            <div key={i} style={{ height: width > 500 ? 260 : 180, borderRadius: th.upper ? 4 : 18, overflow: "hidden", position: "relative" }}>
              <Photo src={p} style={{ position: "absolute", inset: 0 }} zoom={1.05} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
