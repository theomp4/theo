"use client";
// Panneau de la boutique d'une pièce : titre, liste des produits (rendue côté serveur pour le référencement),
// synchronisée avec la pièce 3D. Fonctionne aussi sans WebGL.
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Room } from "@/config/rooms";
import { ROOMS } from "@/config/rooms";
import type { LiteProduct } from "@/lib/catalog";
import { useUI } from "@/store/ui";
import { euro, shopifyImg } from "@/lib/format";

export default function RoomShop({ room, products }: { room: Room; products: LiteProduct[] }) {
  const set = useUI((s) => s.set);
  const hover = useUI((s) => s.hoverProduct);
  const router = useRouter();
  useEffect(() => { set({ roomProducts: products }); return () => set({ roomProducts: [] }); }, [products, set]);
  const back = () => { set({ fromRoom: room.slug, veil: true, sheet: null }); setTimeout(() => router.push("/"), 450); };
  const i = ROOMS.findIndex((r) => r.slug === room.slug), next = ROOMS[(i + 1) % ROOMS.length], prev = ROOMS[(i - 1 + ROOMS.length) % ROOMS.length];
  return (
    <section className="shop" aria-labelledby="room-title">
      <div className="shop-hd">
        <button className="back" onClick={back}>← Retour à l'hôtel</button>
        <span className="lab muted">{room.number === room.title ? "" : `Chambre ${room.number}`}</span>
        <h1 id="room-title">{room.title}</h1>
        <p className="muted">{room.subtitle} · {products.length} pièce{products.length > 1 ? "s" : ""}</p>
      </div>
      <ul className="shop-list">
        {products.map((p) => {
          const min = Math.min(...p.variants.map((v) => v.price)), cmp = p.variants.find((v) => v.compareAt && v.compareAt > v.price)?.compareAt;
          const out = !p.variants.some((v) => v.available);
          return (
            <li key={p.handle} className={hover === p.handle ? "hl" : ""} onMouseEnter={() => set({ hoverProduct: p.handle })} onMouseLeave={() => set({ hoverProduct: null })}>
              <button className="card" onClick={() => set({ sheet: p })}>
                <img src={shopifyImg(p.images[0].src, 360)} alt={p.title} loading="lazy" />
                <span className="card-t">{p.title}</span>
                <span className="card-p">{euro(min)}{cmp ? <s>{euro(cmp)}</s> : null}{out ? <em> · épuisé</em> : null}</span>
              </button>
              <Link href={`/produit/${p.handle}/`} className="sr">Fiche produit {p.title}</Link>
            </li>
          );
        })}
      </ul>
      <div className="shop-ft">
        <Link href={`/chambre/${prev.slug}/`} className="lnk">← {prev.title}</Link>
        <Link href={`/chambre/${next.slug}/`} className="lnk">{next.title} →</Link>
      </div>
    </section>
  );
}
