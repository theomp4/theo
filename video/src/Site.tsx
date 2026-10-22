// Le site d'exemple « Ton commerce », en version ordinateur et mobile.
// Chaque bloc apparaît d'abord en squelette (maquette), puis se « remplit ».
import React from "react";
import { C, fontFamily, tw } from "./theme";
import { useT } from "./components";

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

const Icon: React.FC<{ d: string; size?: number }> = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d={d} fill="none" stroke={C.blue} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICONS = {
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2",
  bag: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};

const Info: React.FC<{ icon: keyof typeof ICONS; title: string; sub: string; size?: number }> = ({ icon, title, sub, size = 1 }) => (
  <div style={{ width: "100%", height: "100%", borderRadius: 16 * size, background: "#F6F8FD", border: `1px solid ${C.line}`, padding: `0 ${18 * size}px`, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 14 * size }}>
    <div style={{ width: 44 * size, height: 44 * size, borderRadius: 12 * size, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px -4px rgba(14,26,58,0.15)" }}>
      <Icon d={ICONS[icon]} size={22 * size} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 16 * size, fontWeight: 700, color: C.navy, whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ fontSize: 14 * size, fontWeight: 500, color: C.grey, whiteSpace: "nowrap" }}>{sub}</div>
    </div>
  </div>
);

const GOOGLE = [
  ["G", "#4285F4"],
  ["o", "#EA4335"],
  ["o", "#FBBC05"],
  ["g", "#4285F4"],
  ["l", "#34A853"],
  ["e", "#EA4335"],
];
const QUERY = "boulangerie près de moi";

// Page de résultats Google (940 × 636) : le site sort en tête et s'illumine
export const GoogleResults: React.FC<{ at: number }> = ({ at }) => {
  const t = useT();
  const chars = Math.floor(tw(t, [at + 0.2, at + 0.95], [0, QUERY.length], (v) => v));
  const r = (i: number) => tw(t, [at + 1.0 + i * 0.12, at + 1.6 + i * 0.12], [0, 1]);
  const glow = tw(t, [at + 1.65, at + 2.1], [0, 1]);
  const pin = tw(t, [at + 1.4, at + 2.0], [0, 1]);
  const appear = (i: number): React.CSSProperties => ({ opacity: r(i), transform: `translateY(${(1 - r(i)) * 20}px)` });
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily, background: C.white }}>
      <div style={{ position: "absolute", left: 36, top: 22, display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 32, letterSpacing: -1 }}>
          {GOOGLE.map(([l, c], i) => (
            <span key={i} style={{ color: c }}>
              {l}
            </span>
          ))}
        </div>
        <div style={{ width: 560, height: 48, borderRadius: 24, border: `1px solid ${C.line}`, boxShadow: "0 2px 8px rgba(14,26,58,0.08)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, fontSize: 18, color: C.navy }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M10.5 3a7.5 7.5 0 1 0 4.6 13.4L20 21.3l1.3-1.3-4.9-4.9A7.5 7.5 0 0 0 10.5 3z" fill={C.grey} />
          </svg>
          {QUERY.slice(0, chars)}
          <span style={{ color: C.blue, opacity: chars < QUERY.length && Math.floor(t * 3) % 2 === 0 ? 1 : 0 }}>|</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 36, top: 88, display: "flex", gap: 26, fontSize: 14, color: C.grey, fontWeight: 500 }}>
        <span style={{ color: C.blue, borderBottom: `3px solid ${C.blue}`, paddingBottom: 6 }}>Tous</span>
        <span>Maps</span>
        <span>Images</span>
        <span>Actualités</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 122, height: 1, background: C.line }} />

      {/* le site du client, en tête */}
      <div
        style={{
          position: "absolute",
          left: 24,
          top: 140,
          width: 640,
          height: 150,
          borderRadius: 18,
          padding: "16px 20px",
          boxSizing: "border-box",
          background: C.white,
          border: `2px solid rgba(65,102,176,${glow})`,
          boxShadow: `0 0 0 ${glow * 8}px rgba(65,102,176,0.12), 0 ${glow * 24}px ${glow * 40}px -16px rgba(65,102,176,0.45)`,
          transform: `scale(${1 + glow * 0.03})`,
          ...appear(0),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.navy, color: "#fff", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>T</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Ton commerce</span>
            <span style={{ fontSize: 12, color: C.grey }}>https://ton-commerce.fr</span>
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: "#1A47B8", marginTop: 8 }}>Boulangerie artisanale – Ton commerce</div>
        <div style={{ fontSize: 14, color: C.grey, marginTop: 4, lineHeight: 1.4 }}>Pains, viennoiseries et pâtisseries faits maison. Ouvert 7j/7 dès 7h…</div>
      </div>

      {/* les autres résultats, en retrait */}
      {[1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 44, top: 170 + i * 150, width: 600, ...appear(i), opacity: r(i) * 0.6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: "#E4EAF5" }} />
            <div style={{ width: 160, height: 12, borderRadius: 6, background: "#E4EAF5" }} />
          </div>
          <div style={{ width: 380, height: 18, borderRadius: 9, background: "#D5DDEC", marginTop: 14 }} />
          <div style={{ width: 540, height: 11, borderRadius: 6, background: "#E9EEF7", marginTop: 12 }} />
          <div style={{ width: 460, height: 11, borderRadius: 6, background: "#E9EEF7", marginTop: 8 }} />
        </div>
      ))}

      {/* mini-carte */}
      <div style={{ position: "absolute", left: 690, top: 140, width: 226, height: 300, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.line}`, ...appear(1) }}>
        <div style={{ position: "absolute", inset: 0, background: "#EAF0FA", backgroundImage: "linear-gradient(#fff 3px, transparent 3px), linear-gradient(90deg, #fff 3px, transparent 3px)", backgroundSize: "56px 56px", transform: "rotate(-12deg) scale(1.4)" }} />
        <div style={{ position: "absolute", left: 30, top: 170, width: 160, height: 26, borderRadius: 13, background: "#CFE0C4", transform: "rotate(-12deg)" }} />
        <svg width="54" height="54" viewBox="0 0 24 24" style={{ position: "absolute", left: 86, top: 92, transform: `translateY(${(1 - pin) * -40}px) scale(${0.6 + pin * 0.4})`, opacity: pin }}>
          <path d="M12 22s-7-6.4-7-12a7 7 0 0 1 14 0c0 5.6-7 12-7 12z" fill="#EA4335" />
          <circle cx="12" cy="10" r="2.6" fill="#fff" />
        </svg>
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, padding: "10px 12px", borderRadius: 12, background: C.white, fontSize: 13, fontWeight: 700, color: C.navy, boxShadow: "0 6px 14px -6px rgba(14,26,58,0.25)" }}>
          Ton commerce
          <div style={{ fontSize: 11, fontWeight: 500, color: "#1E8E3E" }}>Ouvert · Ferme à 20:00</div>
        </div>
      </div>
    </div>
  );
};

const Product: React.FC<{ hue: string; label: string }> = ({ hue, label }) => (
  <div style={{ width: "100%", height: "100%", borderRadius: 16, background: C.white, border: `1px solid ${C.line}`, overflow: "hidden" }}>
    <div style={{ height: "68%", background: hue }} />
    <div style={{ padding: "10px 14px", fontWeight: 600, fontSize: 15, color: C.navy }}>{label}</div>
  </div>
);

// Contenu du site version ordinateur : 940 × 636
export const DesktopSite: React.FC<{ skel: number; fill: number }> = ({ skel, fill }) => {
  const st = (i: number) => skel + i * 0.12;
  const ft = (i: number) => fill + i * 0.32;
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily, background: C.white }}>
      <Block x={36} y={22} w={220} h={34} skelAt={st(0)} fillAt={ft(0)} radius={17}>
        <Logo size={20} />
      </Block>
      <Block x={430} y={26} w={300} h={26} skelAt={st(0)} fillAt={ft(0)} radius={13}>
        <div style={{ display: "flex", gap: 22, fontSize: 15, fontWeight: 500, color: C.grey, height: "100%", alignItems: "center", whiteSpace: "nowrap" }}>
          <span style={{ color: C.navy }}>Accueil</span>
          <span>Carte</span>
          <span>À propos</span>
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

      <Block x={36} y={384} w={276} h={86} skelAt={st(3)} fillAt={ft(3)}>
        <Info icon="clock" title="Ouvert aujourd'hui" sub="7h – 20h" />
      </Block>
      <Block x={332} y={384} w={276} h={86} skelAt={st(3)} fillAt={ft(3) + 0.1}>
        <Info icon="bag" title="Click & collect" sub="Commande en ligne" />
      </Block>
      <Block x={628} y={384} w={276} h={86} skelAt={st(3)} fillAt={ft(3) + 0.2}>
        <Info icon="pin" title="Nous trouver" sub="Centre-ville" />
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
export const MobileSite: React.FC<{ scroll: number }> = ({ scroll }) => (
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
      <div style={{ margin: "22px 26px 0", height: 80 }}>
        <Info icon="clock" title="Ouvert aujourd'hui" sub="7h – 20h" />
      </div>
      <div style={{ margin: "14px 26px 0", height: 80 }}>
        <Info icon="bag" title="Click & collect" sub="Commande en ligne" />
      </div>
      <div style={{ display: "flex", gap: 14, margin: "16px 26px 40px", height: 160 }}>
        <Product hue="linear-gradient(135deg,#DCE5F6,#AFC2EA)" label="Viennoiseries" />
        <Product hue="linear-gradient(135deg,#AFC2EA,#4166B0)" label="Pâtisseries" />
      </div>
    </div>
  </div>
);
