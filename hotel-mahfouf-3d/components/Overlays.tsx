"use client";
// Interface toujours disponible par-dessus l'hôtel : en-tête, menu des pièces, recherche, panier, fiche produit.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ROOMS } from "@/config/rooms";
import { useCart, cartCount, cartTotal } from "@/store/cart";
import { useUI } from "@/store/ui";
import { euro, shopifyImg } from "@/lib/format";
import { CHECKOUT_ENABLED, checkoutUrl } from "@/lib/commerce";
import ProductPurchase from "./ProductPurchase";

export function Header() {
  const lines = useCart((s) => s.lines);
  const setCart = useCart((s) => s.setOpen);
  const set = useUI((s) => s.set);
  const menu = useUI((s) => s.menuOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const n = mounted ? cartCount(lines) : 0;
  return (
    <header className="hdr">
      <Link href="/" className="mark" aria-label="Retour à l'hôtel">Hôtel <em>Mahfouf</em></Link>
      <nav className="hdr-nav" aria-label="Pièces de l'hôtel">
        <button className="lnk" onClick={() => set({ menuOpen: !menu })} aria-expanded={menu}>Les pièces</button>
        <button className="lnk" onClick={() => set({ searchOpen: true })}>Rechercher</button>
        <button className="lnk cart" onClick={() => setCart(true)}>Panier <b>{n}</b></button>
      </nav>
      {menu && (
        <div className="menu" onMouseLeave={() => set({ menuOpen: false })}>
          {ROOMS.map((r) => (
            <Link key={r.slug} href={`/chambre/${r.slug}/`} onClick={() => set({ menuOpen: false })}>
              <span className="num">{r.number}</span><span>{r.title}</span><small>{r.subtitle}</small>
            </Link>
          ))}
          <Link href="/" className="menu-home" onClick={() => set({ menuOpen: false })}>← Revenir à la façade</Link>
        </div>
      )}
    </header>
  );
}

export function CartDrawer() {
  const { lines, open, setOpen, setQty, remove } = useCart();
  const set = useUI((s) => s.set);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const checkout = () => {
    if (CHECKOUT_ENABLED) { window.location.href = checkoutUrl(lines); return; }
    set({ notice: "Maquette de présentation : le paiement est désactivé. En production, cette étape ouvre le paiement sécurisé Shopify avec ce panier." });
  };
  return (
    <>
      <div className={`scrim ${open ? "on" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`drawer ${open ? "on" : ""}`} aria-label="Panier" aria-hidden={!open}>
        <div className="drawer-hd"><h2>Votre <em>valise</em></h2><button className="lnk" onClick={() => setOpen(false)}>Fermer</button></div>
        <div className="drawer-body">
          {!lines.length && <p className="muted">Votre panier est vide. Entrez dans une pièce de l'hôtel pour découvrir la collection.</p>}
          {lines.map((l) => (
            <div className="line" key={l.variantId}>
              <img src={shopifyImg(l.image, 200)} alt="" />
              <div>
                <Link href={`/produit/${l.handle}/`} onClick={() => setOpen(false)} className="line-t">{l.title}</Link>
                {l.variantTitle && <div className="muted small">{l.variantTitle}</div>}
                <div className="qty small">
                  <button onClick={() => setQty(l.variantId, l.qty - 1)} aria-label="Retirer un">−</button><span>{l.qty}</span>
                  <button onClick={() => setQty(l.variantId, l.qty + 1)} aria-label="Ajouter un">+</button>
                  <button className="lnk rm" onClick={() => remove(l.variantId)}>Supprimer</button>
                </div>
              </div>
              <span className="price">{euro(l.price * l.qty)}</span>
            </div>
          ))}
        </div>
        <div className="drawer-ft">
          <div className="tot"><span>Sous-total</span><span>{euro(cartTotal(lines))}</span></div>
          <button className="btn-main" disabled={!lines.length} onClick={checkout}>Passer commande</button>
          <Link href="/panier/" className="lnk center" onClick={() => setOpen(false)}>Voir le panier</Link>
        </div>
      </aside>
    </>
  );
}

type Hit = { h: string; t: string; k: string; p: number; i: string };
export function Search() {
  const open = useUI((s) => s.searchOpen), set = useUI((s) => s.set);
  const [q, setQ] = useState(""); const [idx, setIdx] = useState<Hit[] | null>(null);
  useEffect(() => { if (open && !idx) fetch("/search-index.json").then((r) => r.json()).then(setIdx).catch(() => setIdx([])); }, [open, idx]);
  const res = useMemo(() => {
    if (!idx || q.trim().length < 2) return [];
    const n = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const words = n(q).split(/\s+/).filter(Boolean);
    return idx.filter((x) => words.every((w) => n(x.t + " " + x.k).includes(w))).slice(0, 24);
  }, [idx, q]);
  if (!open) return null;
  return (
    <div className="search" role="dialog" aria-label="Recherche">
      <div className="search-box">
        <input autoFocus id="search" placeholder="Robe, manteau, mug, livre…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && set({ searchOpen: false })} />
        <button className="lnk" onClick={() => set({ searchOpen: false })}>Fermer</button>
      </div>
      <div className="search-res">
        {q.trim().length >= 2 && !res.length && <p className="muted">Aucun résultat pour « {q} ».</p>}
        {res.map((r) => (
          <Link key={r.h} href={`/produit/${r.h}/`} className="res" onClick={() => set({ searchOpen: false })}>
            <img src={shopifyImg(r.i, 240)} alt="" loading="lazy" /><span>{r.t}</span><small>{euro(r.p)}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Sheet() {
  const p = useUI((s) => s.sheet), set = useUI((s) => s.set);
  const [img, setImg] = useState(0);
  useEffect(() => setImg(0), [p]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && set({ sheet: null }); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [set]);
  return (
    <>
      <div className={`scrim ${p ? "on" : ""}`} onClick={() => set({ sheet: null })} />
      <aside className={`sheet ${p ? "on" : ""}`} aria-label="Fiche produit" aria-hidden={!p}>
        {p && (
          <>
            <button className="lnk sheet-x" onClick={() => set({ sheet: null })}>Fermer</button>
            <div className="sheet-media">
              <img src={shopifyImg(p.images[img]?.src, 900)} alt={p.title} />
              <div className="thumbs">{p.images.slice(0, 6).map((im, i) => <button key={im.src} className={i === img ? "on" : ""} onClick={() => setImg(i)}><img src={shopifyImg(im.src, 160)} alt="" /></button>)}</div>
            </div>
            <div className="sheet-info">
              <span className="lab muted">{p.type || "Hôtel Mahfouf"}</span>
              <h2>{p.title}</h2>
              <ProductPurchase p={p} compact />
              {p.description && <p className="desc">{p.description.slice(0, 420)}{p.description.length > 420 ? "…" : ""}</p>}
              <Link className="lnk" href={`/produit/${p.handle}/`} onClick={() => set({ sheet: null })}>Voir la fiche complète →</Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export function Notice() {
  const n = useUI((s) => s.notice), set = useUI((s) => s.set);
  if (!n) return null;
  return (
    <div className="notice" role="alertdialog" aria-label="Information">
      <div><span className="lab">Maquette</span><p>{n}</p><button className="btn-main" onClick={() => set({ notice: null })}>Compris</button></div>
    </div>
  );
}

export function HotelHUD() {
  const path = usePathname();
  const hover = useUI((s) => s.hover), busy = useUI((s) => s.busy), enter = useUI((s) => s.enter);
  const router = useRouter();
  if (path !== "/") return null;
  const hovered = ROOMS.find((r) => r.slug === hover);
  return (
    <div className={`hud ${busy ? "busy" : ""}`}>
      <div className="hud-title">
        <span className="lab">Paris · Maison de vêtements</span>
        <h1>Hôtel <em>Mahfouf</em></h1>
        <p>Faites le tour de l'hôtel avec les flèches, puis cliquez sur une fenêtre éclairée pour entrer dans une boutique.</p>
      </div>
      <div className="hud-hover" aria-live="polite">{hovered ? <><b>{hovered.number}</b> {hovered.title} <small>{hovered.subtitle}</small></> : null}</div>
      <nav className="hud-rooms" aria-label="Accès direct aux pièces">
        {ROOMS.map((r) => (
          <a key={r.slug} href={`/chambre/${r.slug}/`} onClick={(e) => { e.preventDefault(); if (enter) enter(r.slug); else router.push(`/chambre/${r.slug}/`); }}>
            <span>{r.number}</span>{r.title}
          </a>
        ))}
      </nav>
    </div>
  );
}
