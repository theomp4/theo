// Passage en caisse.
// Ce projet est une MAQUETTE DE PRÉSENTATION : le paiement est volontairement désactivé.
// En production, deux options officielles Shopify, sans rien changer au reste du site :
//  1. Storefront API (recommandé) : NEXT_PUBLIC_SHOPIFY_DOMAIN + NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN,
//     création du panier avec la mutation `cartCreate`, puis redirection vers `cart.checkoutUrl`.
//  2. Lien panier Shopify : https://<boutique>/cart/<variantId>:<quantité>,<variantId>:<quantité>
// Les identifiants de variantes utilisés dans le panier sont déjà ceux du catalogue Shopify réel.
import type { CartLine } from "@/store/cart";

export const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true";
const SHOP = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN || "hotelmahfouf.com";

export function checkoutUrl(lines: CartLine[]) {
  return `https://${SHOP}/cart/` + lines.map((l) => `${l.variantId}:${l.qty}`).join(",");
}
