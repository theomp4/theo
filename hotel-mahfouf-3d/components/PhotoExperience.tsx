"use client";
// L'hôtel animé à partir des images de référence photoréalistes (aucune 3D) :
// nuages qui dérivent dans le ciel seulement, fenêtres et lanternes qui s'allument puis scintillent,
// halo du soleil, oiseaux, respiration de la caméra et parallaxe, trois points de vue,
// zoom cinématographique dans la fenêtre choisie puis ouverture sur la photo de la pièce.
// Tout est animé par le compositeur du navigateur (transform / opacity) : fluide jusqu'à 120 i/s.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { IMG_H, IMG_W, INTERIORS, VIEWS, type Spot } from "@/config/views";
import { ROOMS } from "@/config/rooms";
import lightsData from "@/data/lights.json";
import { useUI } from "@/store/ui";

type Light = { x: number; y: number; w: number; h: number };
const LIGHTS = lightsData as Record<string, Light[]>;
const SUN: Record<string, [number, number]> = { "1": [1650, 250], "2": [1640, 140], "3": [1640, 345] };
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function useViewport() {
  const [v, setV] = useState({ w: 1440, h: 900 });
  useEffect(() => { const f = () => setV({ w: window.innerWidth, h: window.innerHeight }); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return v;
}

export default function PhotoExperience() {
  const path = usePathname() || "/";
  const slug = path.startsWith("/chambre/") ? path.split("/")[2] : null;
  const home = path === "/";
  const veil = useUI((s) => s.veil);
  return (
    <>
      <div className={`stage ${home || slug ? "" : "is-off"}`} aria-hidden>
        {home && <Facade />}
        {slug && INTERIORS[slug] && <Interior key={slug} slug={slug} />}
      </div>
      <div className={`veil ${veil ? "on" : ""}`} aria-hidden />
    </>
  );
}

/* ---------------- La façade ---------------- */
function Facade() {
  const vp = useViewport();
  const router = useRouter();
  const set = useUI((s) => s.set);
  const hover = useUI((s) => s.hover);
  const busy = useUI((s) => s.busy);
  const [vi, setVi] = useState(0);              // vue affichée
  const [dir, setDir] = useState(1);
  const outer = useRef<HTMLDivElement>(null), cam = useRef<HTMLDivElement>(null), bloom = useRef<HTMLDivElement>(null);
  const zoom = useRef<{ k: number; spot: Spot | null }>({ k: 0, spot: null });
  if (zoom.current.spot === null && zoom.current.k === 0) { const f = useUI.getState().fromRoom; if (f && VIEWS[0].spots[f]) zoom.current = { k: 1, spot: VIEWS[0].spots[f] }; }

  // l'image couvre l'écran avec une petite marge pour la parallaxe
  const S = Math.max(vp.w / IMG_W, vp.h / IMG_H) * 1.06;
  const AW = IMG_W * S, AH = IMG_H * S, AX = (vp.w - AW) / 2, AY = (vp.h - AH) / 2;

  // caméra : respiration lente + parallaxe (souris) + zoom vers une fenêtre
  useEffect(() => {
    let raf = 0, tx = 0, ty = 0, px = 0, py = 0, last = performance.now();
    const move = (e: PointerEvent) => { tx = (e.clientX / window.innerWidth - 0.5); ty = (e.clientY / window.innerHeight - 0.5); };
    window.addEventListener("pointermove", move, { passive: true });
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const t = now / 1000, a = 1 - Math.exp(-dt * 2.2);
      const touch = window.matchMedia("(pointer: coarse)").matches;
      const gx = touch ? Math.sin(t * 0.07) * 0.35 : tx, gy = touch ? Math.cos(t * 0.05) * 0.2 : ty;
      px += (gx - px) * a; py += (gy - py) * a;
      const breath = 1.012 + Math.sin(t * 0.13) * 0.012;
      if (outer.current) outer.current.style.transform = `translate3d(${-px * AW * 0.022}px, ${-py * AH * 0.018}px, 0) scale(${breath})`;
      const z = zoom.current;
      if (cam.current) {
        if (z.spot && z.k > 0) {
          const e = z.k, Z = 1 + e * (Math.min(vp.w / (z.spot.w * S), vp.h / (z.spot.h * S)) * 0.55 - 1);
          const fx = z.spot.x * S, fy = z.spot.y * S;
          const Px = (AX + fx) + (vp.w / 2 - (AX + fx)) * e, Py = (AY + fy) + (vp.h / 2 - (AY + fy)) * e;
          cam.current.style.transform = `translate3d(${Px - AX - fx * Z}px, ${Py - AY - fy * Z}px, 0) scale(${Z})`;
        } else cam.current.style.transform = "none";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); };
  }, [AW, AH, AX, AY, S, vp.w, vp.h]);

  const view = VIEWS[vi];
  const enter = useCallback((s: string) => {
    if (useUI.getState().busy) return;
    const spot = VIEWS[vi].spots[s]; if (!spot) { router.push(`/chambre/${s}/`); return; }
    set({ busy: true, hover: s }); zoom.current.spot = spot;
    const tl = gsap.timeline();
    tl.to(zoom.current, { k: 1, duration: 2.1, ease: "power2.in" }, 0)
      .to(bloom.current, { opacity: 1, scale: 1.8, duration: 1.2, ease: "power2.in" }, 0.9)
      .call(() => set({ veil: true }), [], 1.75)
      .call(() => { set({ fromRoom: s, hover: null }); router.push(`/chambre/${s}/`); }, [], 2.3);
  }, [router, set, vi]);
  useEffect(() => { set({ enter }); return () => set({ enter: null }); }, [enter, set]);

  // retour d'une pièce : on ressort de la fenêtre
  useEffect(() => {
    const from = useUI.getState().fromRoom, spot = from ? VIEWS[0].spots[from] : null;
    if (spot) {
      zoom.current.spot = spot; zoom.current.k = 1; set({ busy: true });
      if (bloom.current) gsap.set(bloom.current, { opacity: 1, scale: 1.8 });
      const tl = gsap.timeline({ onComplete: () => set({ busy: false, fromRoom: null }) });
      tl.call(() => set({ veil: false }), [], 0.1)
        .to(bloom.current, { opacity: 0, scale: 1, duration: 1.4, ease: "power2.out" }, 0.1)
        .to(zoom.current, { k: 0, duration: 2.4, ease: "power3.out" }, 0.15);
      return () => { tl.kill(); };
    }
    set({ veil: false, busy: false });
  }, [set]);

  const go = useCallback((d: number) => { if (useUI.getState().busy) return; setDir(d); setVi((i) => (i + d + VIEWS.length) % VIEWS.length); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    let x0 = 0; const ts = (e: TouchEvent) => { x0 = e.touches[0].clientX; }, te = (e: TouchEvent) => { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); };
    window.addEventListener("keydown", k); window.addEventListener("touchstart", ts, { passive: true }); window.addEventListener("touchend", te);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("touchstart", ts); window.removeEventListener("touchend", te); };
  }, [go]);

  const hs = (hover ? view.spots[hover] : null) || zoom.current.spot;
  return (
    <div className={`facade ${busy ? "busy" : ""}`}>
      <div className="outer" ref={outer}>
        <div className="cam" ref={cam} style={{ left: AX, top: AY, width: AW, height: AH }}>
          {VIEWS.map((v, i) => <Photo key={v.id} v={v} active={i === vi} dir={dir} />)}
          <div className="spots">
            {ROOMS.map((r) => {
              const s = view.spots[r.slug]; if (!s) return null;
              return (
                <button key={r.slug + view.id} className={`spot ${hover === r.slug ? "on" : ""}`} aria-label={`Entrer : ${r.title}`}
                  style={{ left: `${(s.x / IMG_W) * 100}%`, top: `${(s.y / IMG_H) * 100}%`, width: `${(s.w / IMG_W) * 100}%`, height: `${(s.h / IMG_H) * 100}%` }}
                  onMouseEnter={() => !useUI.getState().busy && set({ hover: r.slug })} onMouseLeave={() => !useUI.getState().busy && set({ hover: null })}
                  onFocus={() => set({ hover: r.slug })} onBlur={() => set({ hover: null })} onClick={() => enter(r.slug)}>
                  <i className="dot" /><span className="tag">{r.number === r.title ? r.title : `${r.number} · ${r.title}`}</span>
                </button>
              );
            })}
          </div>
          <div className="bloom" ref={bloom} style={hs ? { left: `${(hs.x / IMG_W) * 100}%`, top: `${(hs.y / IMG_H) * 100}%`, width: `${(hs.w / IMG_W) * 300}%`, height: `${(hs.h / IMG_H) * 300}%` } : { display: "none" }} />
        </div>
      </div>
      <div className="vignette" />
      <div className="views">
        <button onClick={() => go(-1)} aria-label="Vue précédente">‹</button>
        <span><b>{String(vi + 1).padStart(2, "0")}</b> / 03 · {view.name}</span>
        <button onClick={() => go(1)} aria-label="Vue suivante">›</button>
      </div>
    </div>
  );
}

function Photo({ v, active, dir }: { v: (typeof VIEWS)[number]; active: boolean; dir: number }) {
  const lights = LIGHTS[v.id] || [];
  const [sx, sy] = SUN[v.id];
  const birds = useMemo(() => [0, 1, 2, 3, 4].map((i) => ({ dx: rnd(i) * 40, dy: rnd(i + 9) * 26, s: 0.7 + rnd(i + 3) * 0.6, d: rnd(i + 5) * 0.4 })), []);
  return (
    <div className={`photo ${active ? "on" : ""}`} style={{ ["--dir" as string]: dir }}>
      <img src={v.src} alt={`Hôtel Mahfouf, ${v.name}`} draggable={false} decoding="async" />
      <div className="sky" style={{ maskImage: `url(${v.sky})`, WebkitMaskImage: `url(${v.sky})` }}>
        <div className="cloud a" style={{ backgroundImage: `url(${v.src})` }} />
        <div className="cloud b" style={{ backgroundImage: `url(${v.src})` }} />
      </div>
      <div className="sun" style={{ left: `${(sx / IMG_W) * 100}%`, top: `${(sy / IMG_H) * 100}%` }} />
      <div className="lights">
        {lights.map((l, i) => (
          <span key={i} className={`lt ${rnd(i + 3) > 0.9 ? "slow" : ""}`}
            style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${Math.max(l.w, 0.8) * 2.4}%`, height: `${Math.max(l.h, 1.2) * 2.0}%`,
              ["--d" as string]: `${2.6 + rnd(i) * 4.5}s`, ["--o" as string]: `${0.5 + (l.y / 100) * 0.4 + rnd(i + 1) * 1.6}s`, ["--a" as string]: 0.3 + rnd(i + 7) * 0.3 }} />
        ))}
      </div>
      <svg className="birds" viewBox="0 0 100 40" aria-hidden>
        {birds.map((b, i) => (
          <g key={i} transform={`translate(${b.dx} ${b.dy}) scale(${b.s})`}>
            <path className="wing" style={{ animationDelay: `${b.d}s` }} d="M0 2 Q2 0 4 2 Q6 0 8 2" fill="none" stroke="#3b2a33" strokeWidth=".55" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------------- L'intérieur d'une pièce ---------------- */
function Interior({ slug }: { slug: string }) {
  const it = INTERIORS[slug];
  const set = useUI((s) => s.set);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const t = setTimeout(() => set({ veil: false, busy: false }), 120); return () => clearTimeout(t); }, [set]);
  // poussière dorée dans la lumière (canvas basse résolution, ~60 particules)
  useEffect(() => {
    const c = canvas.current; if (!c) return; const x = c.getContext("2d"); if (!x) return;
    let raf = 0; const W = (c.width = Math.round(window.innerWidth / 2)), H = (c.height = Math.round(window.innerHeight / 2));
    const P = Array.from({ length: 60 }, (_, i) => ({ x: rnd(i) * W, y: rnd(i + 30) * H, r: 0.6 + rnd(i + 60) * 1.8, v: 3 + rnd(i + 90) * 8, ph: rnd(i + 120) * 6 }));
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now; x.clearRect(0, 0, W, H);
      for (const p of P) {
        p.y -= p.v * dt; p.x += Math.sin(now / 1800 + p.ph) * 4 * dt; if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        const a = 0.25 + 0.35 * Math.sin(now / 900 + p.ph) ** 2;
        x.fillStyle = `rgba(255,226,170,${a})`; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`interior ${it.wide ? "wide" : ""}`}>
      <img src={it.src} alt="" style={{ objectPosition: it.focus }} draggable={false} />
      <div className="warm" />
      <canvas ref={canvas} className="dust" />
    </div>
  );
}
