"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart, cartTotal } from "@/store/cart";
import { useUI } from "@/store/ui";
import { euro, shopifyImg } from "@/lib/format";
import { CHECKOUT_ENABLED, checkoutUrl } from "@/lib/commerce";

export default function CartPage() {
  const { lines, setQty, remove } = useCart(); const set = useUI((s) => s.set);
  const [m, setM] = useState(false); useEffect(() => setM(true), []);
  if (!m) return null;
  return (
    <section className="cartpage">
      <Link href="/" className="lnk">← Retour à l'hôtel</Link>
      <h1>Votre <em>valise</em></h1>
      {!lines.length && <p className="muted">Votre panier est vide.</p>}
      {lines.map((l) => (
        <div className="line" key={l.variantId}>
          <img src={shopifyImg(l.image, 240)} alt="" />
          <div><Link href={`/produit/${l.handle}/`} className="line-t">{l.title}</Link>{l.variantTitle && <div className="muted small">{l.variantTitle}</div>}
            <div className="qty small"><button onClick={() => setQty(l.variantId, l.qty - 1)}>−</button><span>{l.qty}</span><button onClick={() => setQty(l.variantId, l.qty + 1)}>+</button><button className="lnk rm" onClick={() => remove(l.variantId)}>Supprimer</button></div></div>
          <span className="price">{euro(l.price * l.qty)}</span>
        </div>
      ))}
      {!!lines.length && (
        <div className="drawer-ft">
          <div className="tot"><span>Sous-total</span><span>{euro(cartTotal(lines))}</span></div>
          <button className="btn-main" onClick={() => CHECKOUT_ENABLED ? (window.location.href = checkoutUrl(lines)) : set({ notice: "Maquette de présentation : le paiement est désactivé. En production, cette étape ouvre le paiement sécurisé Shopify avec ce panier." })}>Passer commande</button>
        </div>
      )}
    </section>
  );
}
