"use client";
// Choix taille / couleur / quantité et ajout au panier. Utilisé dans la fiche latérale et sur la page produit.
import { useMemo, useState } from "react";
import Link from "next/link";
import type { LiteProduct } from "@/lib/catalog";
import { useCart } from "@/store/cart";
import { euro, shopifyImg } from "@/lib/format";

export default function ProductPurchase({ p, compact = false }: { p: LiteProduct; compact?: boolean }) {
  const add = useCart((s) => s.add);
  const opts = p.options;
  const [sel, setSel] = useState<string[]>(() => {
    const first = p.variants.find((v) => v.available) || p.variants[0];
    return first ? [...first.options] : [];
  });
  const [qty, setQty] = useState(1);
  const variant = useMemo(() => p.variants.find((v) => v.options.every((o, i) => o === sel[i])) || (opts.length ? undefined : p.variants[0]), [p, sel, opts.length]);
  const availableFor = (i: number, value: string) => p.variants.some((v) => v.available && v.options[i] === value && v.options.every((o, k) => k === i || !sel[k] || o === sel[k]));
  const price = variant?.price ?? Math.min(...p.variants.map((v) => v.price));
  const compareAt = variant?.compareAt;

  return (
    <div className="buy">
      <div className="buy-price">
        <span>{euro(price)}</span>
        {compareAt && compareAt > price ? <s>{euro(compareAt)}</s> : null}
      </div>

      {p.colors.length > 1 && (
        <div className="buy-row">
          <span className="lab">Couleur</span>
          <div className="swatches">
            {p.colors.map((c) => (
              <Link key={c.handle} href={`/produit/${c.handle}/`} className={`swatch ${c.handle === p.handle ? "on" : ""}`} title={c.label} aria-label={`Couleur ${c.label}`}>
                <img src={shopifyImg(c.image, 120)} alt="" loading="lazy" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {opts.map((o, i) => (
        <div className="buy-row" key={o.name}>
          <span className="lab">{o.name}</span>
          <div className="chips" role="radiogroup" aria-label={o.name}>
            {o.values.map((v) => {
              const ok = availableFor(i, v);
              return (
                <button key={v} role="radio" aria-checked={sel[i] === v} className={`chip ${sel[i] === v ? "on" : ""} ${ok ? "" : "out"}`}
                  onClick={() => setSel((s) => { const n = [...s]; n[i] = v; return n; })}>{v}</button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="buy-row">
        <span className="lab">Quantité</span>
        <div className="qty">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Retirer un">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Ajouter un">+</button>
        </div>
      </div>

      <button className="btn-main" disabled={!variant || !variant.available}
        onClick={() => variant && add({ variantId: variant.id, handle: p.handle, title: p.title, variantTitle: variant.title === "Default Title" ? "" : variant.title, image: p.images[0]?.src || "", price: variant.price }, qty)}>
        {!variant ? "Choisissez une option" : variant.available ? "Ajouter au panier" : "Épuisé"}
      </button>
      {!compact && <p className="buy-note">Livraison et retours selon les conditions de la boutique Hôtel Mahfouf.</p>}
    </div>
  );
}
