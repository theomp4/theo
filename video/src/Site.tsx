// Le site d'exemple « Ton commerce », en version ordinateur et mobile.
// Chaque bloc apparaît d'abord en squelette (maquette), puis se « remplit ».
import React from "react";
import { C, EASE, fontFamily, shadow, tw } from "./theme";
import { GoogleG, StarRow, useT } from "./components";

const Block: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  skelAt: number;
  fillAt: number;
  radius?: number;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}> = ({ x, y, w, h, skelAt, fillAt, radius = 14, children, skeleton }) => {
  const t = useT();
  const s = tw(t, [skelAt, skelAt + 0.6], [0, 1]);
  const f = tw(t, [fillAt, fillAt + 0.7], [0, 1]);
  const shimmerX = ((t * 1.1 + x / 900) % 1.6) * 200 - 60;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      {f < 1 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: s * (1 - f),
            transform: `translateY(${(1 - s) * 18}px)`,
          }}
        >
          {skeleton ?? (
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: radius,
                background: `linear-gradient(100deg, #E4EAF5 ${shimmerX - 30}%, #F3F6FC ${shimmerX}%, #E4EAF5 ${shimmerX + 30}%)`,
              }}
            />
          )}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: f,
          transform: `translateY(${(1 - f) * 14}px) scale(${0.97 + f * 0.03})`,
          filter: `blur(${(1 - f) * 8}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Skel: React.FC<{ rows: [number, number][] }> = ({ rows }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {rows.map(([w, h], i) => (
      <div key={i} style={{ width: `${w}%`, height: h, borderRadius: h / 2, background: "#E4EAF5" }} />
    ))}
  </div>
);

const Btn: React.FC<{ children: React.ReactNode; ghost?: boolean; size?: number; style?: React.CSSProperties }> = ({ children, ghost, size = 17, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: `${size * 0.7}px ${size * 1.4}px`,
      borderRadius: 999,
      background: ghost ? "transparent" : C.blue,
      border: ghost ? `2px solid ${C.line}` : "none",
      color: ghost ? C.navy : C.white,
      fontWeight: 600,
      fontSize: size,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

// Illustration de la vitrine (formes douces dans les tons de la marque)
const HeroArt: React.FC<{ radius: number }> = ({ radius }) => {
  const t = useT();
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: radius,
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(140deg, #C9D7F2 0%, #8EA8E0 45%, #4166B0 100%)",
      }}
    >
      <div style={{ position: "absolute", width: "70%", aspectRatio: "1", borderRadius: "50%", right: "-18%", top: "-30%", background: "rgba(255,255,255,0.25)", transform: `translateY(${Math.sin(t * 0.8) * 8}px)` }} />
      <div style={{ position: "absolute", width: "45%", aspectRatio: "1", borderRadius: "50%", left: "-10%", bottom: "-20%", background: "rgba(14,26,58,0.18)" }} />
      {/* devanture stylisée */}
      <div style={{ position: "absolute", left: "18%", right: "18%", bottom: 0, height: "62%", background: "rgba(255,255,255,0.92)", borderRadius: "14px 14px 0 0" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "22%", borderRadius: "14px 14px 0 0", background: `repeating-linear-gradient(90deg, ${C.navy} 0 14%, ${C.blue} 14% 28%)` }} />
        <div style={{ position: "absolute", left: "12%", width: "34%", top: "34%", bottom: 0, borderRadius: "8px 8px 0 0", background: "#DCE5F6" }} />
        <div style={{ position: "absolute", right: "12%", width: "32%", top: "34%", height: "38%", borderRadius: 8, background: "#DCE5F6" }} />
      </div>
    </div>
  );
};

const Logo: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.45 }}>
    <div style={{ width: size * 1.5, height: size * 1.5, borderRadius: size * 0.45, background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.8 }}>T</div>
    <div style={{ fontWeight: 700, fontSize: size, color: C.navy, whiteSpace: "nowrap" }}>Ton commerce</div>
  </div>
);

export const ReviewCard: React.FC<{ scale?: number; starsAt: number }> = ({ scale = 1, starsAt }) => {
  const t = useT();
  const n = tw(t, [starsAt, starsAt + 1.2], [3.9, 4.9], EASE.out);
  const c = Math.round(tw(t, [starsAt, starsAt + 1.2], [19, 287], EASE.out));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 18 * scale,
        background: C.white,
        boxShadow: shadow.soft,
        border: `1px solid ${C.line}`,
        display: "flex",
        alignItems: "center",
        gap: 16 * scale,
        padding: `0 ${22 * scale}px`,
        boxSizing: "border-box",
      }}
    >
      <GoogleG size={34 * scale} />
      <div style={{ fontWeight: 800, fontSize: 40 * scale, color: C.navy, letterSpacing: -1 }}>{n.toFixed(1).replace(".", ",")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 * scale }}>
        <StarRow size={22 * scale} at={starsAt} gap={3 * scale} />
        <div style={{ fontSize: 14 * scale, color: C.grey, fontWeight: 500 }}>
          <span style={{ color: C.blue, fontWeight: 700 }}>{c}</span> avis Google
        </div>
      </div>
    </div>
  );
};

const Quote: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ width: "100%", height: "100%", borderRadius: 14, background: "#F6F8FD", border: `1px solid ${C.line}`, padding: "12px 16px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 6 }}>
    <StarRow size={14} gap={2} />
    <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{text}</div>
  </div>
);

const Product: React.FC<{ hue: string; label: string }> = ({ hue, label }) => (
  <div style={{ width: "100%", height: "100%", borderRadius: 16, background: C.white, border: `1px solid ${C.line}`, overflow: "hidden" }}>
    <div style={{ height: "68%", background: hue }} />
    <div style={{ padding: "10px 14px", fontWeight: 600, fontSize: 15, color: C.navy }}>{label}</div>
  </div>
);

// Contenu du site version ordinateur : 940 × 636
export const DesktopSite: React.FC<{ skel: number; fill: number; starsAt: number }> = ({ skel, fill, starsAt }) => {
  const st = (i: number) => skel + i * 0.12;
  const ft = (i: number) => fill + i * 0.32;
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily, background: C.white }}>
      <Block x={36} y={22} w={220} h={34} skelAt={st(0)} fillAt={ft(0)} radius={17}>
        <Logo size={20} />
      </Block>
      <Block x={430} y={26} w={300} h={26} skelAt={st(0)} fillAt={ft(0)} radius={13}>
        <div style={{ display: "flex", gap: 26, fontSize: 15, fontWeight: 500, color: C.grey, height: "100%", alignItems: "center" }}>
          <span style={{ color: C.navy }}>Accueil</span>
          <span>Carte</span>
          <span>Avis</span>
          <span>Contact</span>
        </div>
      </Block>
      <Block x={770} y={18} w={134} h={42} skelAt={st(0)} fillAt={ft(0)} radius={21}>
        <Btn size={15} style={{ width: "100%", height: "100%", padding: 0 }}>Réserver</Btn>
      </Block>

      <Block x={36} y={110} w={420} h={230} skelAt={st(1)} fillAt={ft(1)} skeleton={<Skel rows={[[92, 44], [70, 44], [80, 16], [55, 16]]} />}>
        <div style={{ fontWeight: 800, fontSize: 46, lineHeight: 1.05, color: C.navy, letterSpacing: -1.2 }}>
          Le goût du
          <br />
          <span style={{ color: C.blue }}>fait maison.</span>
        </div>
        <div style={{ fontSize: 17, color: C.grey, marginTop: 16, lineHeight: 1.45 }}>
          Boulangerie artisanale au cœur du quartier.
          <br />
          Ouvert 7j/7 dès 7h.
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
          <Btn>Voir la carte</Btn>
          <Btn ghost>Nous trouver</Btn>
        </div>
      </Block>
      <Block x={490} y={96} w={414} h={262} skelAt={st(2)} fillAt={ft(2)} radius={20}>
        <HeroArt radius={20} />
      </Block>

      <Block x={36} y={384} w={360} h={86} skelAt={st(3)} fillAt={ft(3)} radius={18}>
        <ReviewCard starsAt={starsAt} />
      </Block>
      <Block x={414} y={384} w={236} h={86} skelAt={st(3)} fillAt={ft(3) + 0.1}>
        <Quote text="Accueil top, je recommande !" />
      </Block>
      <Block x={668} y={384} w={236} h={86} skelAt={st(3)} fillAt={ft(3) + 0.2}>
        <Quote text="Le meilleur pain du coin." />
      </Block>

      {[0, 1, 2].map((i) => (
        <Block key={i} x={36 + i * 296} y={500} w={276} h={170} skelAt={st(4)} fillAt={ft(4) + i * 0.08} radius={16}>
          <Product hue={["linear-gradient(135deg,#DCE5F6,#AFC2EA)", "linear-gradient(135deg,#C9D7F2,#6E8FD6)", "linear-gradient(135deg,#AFC2EA,#4166B0)"][i]} label={["Viennoiseries", "Pains spéciaux", "Pâtisseries"][i]} />
        </Block>
      ))}
    </div>
  );
};

// Contenu du site version mobile : 440 × 900 (défile avec `scroll`)
export const MobileSite: React.FC<{ scroll: number; starsAt: number }> = ({ scroll, starsAt }) => (
  <div style={{ position: "absolute", inset: 0, fontFamily, background: C.white, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${-scroll}px)` }}>
      <div style={{ height: 70 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 26px" }}>
        <Logo size={19} />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 24, height: 3, borderRadius: 2, background: C.navy }} />
          ))}
        </div>
      </div>
      <div style={{ padding: "30px 26px 0" }}>
        <div style={{ fontWeight: 800, fontSize: 40, lineHeight: 1.05, color: C.navy, letterSpacing: -1 }}>
          Le goût du <span style={{ color: C.blue }}>fait maison.</span>
        </div>
        <div style={{ fontSize: 16, color: C.grey, marginTop: 12, lineHeight: 1.45 }}>Boulangerie artisanale au cœur du quartier.</div>
        <Btn style={{ marginTop: 20, width: "100%", boxSizing: "border-box" }}>Voir la carte</Btn>
      </div>
      <div style={{ margin: "26px 26px 0", height: 230 }}>
        <HeroArt radius={20} />
      </div>
      <div style={{ margin: "22px 26px 0", height: 84 }}>
        <ReviewCard starsAt={starsAt} />
      </div>
      <div style={{ margin: "16px 26px 0", height: 74 }}>
        <Quote text="Accueil top, je recommande !" />
      </div>
      <div style={{ display: "flex", gap: 14, margin: "16px 26px 40px", height: 160 }}>
        <Product hue="linear-gradient(135deg,#DCE5F6,#AFC2EA)" label="Viennoiseries" />
        <Product hue="linear-gradient(135deg,#AFC2EA,#4166B0)" label="Pâtisseries" />
      </div>
    </div>
  </div>
);
