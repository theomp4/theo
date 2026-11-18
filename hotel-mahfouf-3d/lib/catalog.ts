// Accès au catalogue réel (instantané du catalogue public Shopify, voir scripts/sync-catalog.mjs).
// Utilisé côté serveur au moment de la génération des pages.
import raw from "@/data/catalog.json";
import type { Room } from "@/config/rooms";

export type Variant = { id: number; title: string; available: boolean; price: number; compareAt: number | null; options: string[] };
export type Product = {
  id: number; handle: string; title: string; type: string; vendor: string; tags: string[]; publishedAt: string;
  description: string; images: { src: string; w: number; h: number }[];
  options: { name: string; values: string[] }[]; variants: Variant[]; sizeOption: number; colorSiblings: string[];
};
type Catalog = { syncedAt: string; products: Product[]; collections: Record<string, string[]>; collectionInfo: Record<string, { title: string; description: string }> };
const catalog = raw as unknown as Catalog;

const byHandle = new Map(catalog.products.map((p) => [p.handle, p]));
export const allProducts = () => catalog.products;
export const getProduct = (handle: string) => byHandle.get(handle);
export const syncedAt = catalog.syncedAt;

const visible = (p?: Product): p is Product => !!p && p.images.length > 0 && p.variants.some((v) => v.price > 0.5);

export function productsForRoom(room: Room): Product[] {
  const s = room.source;
  let list: (Product | undefined)[] = [];
  if (s.kind === "latest") list = [...catalog.products].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, s.count * 2);
  else if (s.kind === "collection") list = (catalog.collections[s.handle] || []).map(getProduct);
  else list = s.handles.flatMap((h) => (catalog.collections[h] || []).map(getProduct));
  const seen = new Set<string>();
  const out = list.filter(visible).filter((p) => (seen.has(p.handle) ? false : (seen.add(p.handle), true)));
  return s.kind === "latest" ? out.slice(0, s.count) : out;
}

/** Déclinaisons couleur : produits de même nom, avec leur couleur déduite de l'URL Shopify */
export function colorLabel(p: Product) {
  const base = p.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
  let tail = p.handle.replace(base, "").replace(/^-+|-+$/g, "");
  if (!tail) tail = p.handle.split("-").slice(-1)[0];
  return tail.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
export function siblingsOf(p: Product) {
  return p.colorSiblings.map(getProduct).filter(visible).map((s) => ({ handle: s.handle, label: colorLabel(s), image: s.images[0]?.src || "" }));
}

/** Version allégée transmise au navigateur */
export type LiteProduct = Pick<Product, "handle" | "title" | "type" | "description" | "images" | "options" | "variants" | "sizeOption"> & {
  colors: { handle: string; label: string; image: string }[];
};
export function lite(p: Product): LiteProduct {
  return { handle: p.handle, title: p.title, type: p.type, description: p.description, images: p.images, options: p.options, variants: p.variants, sizeOption: p.sizeOption, colors: siblingsOf(p) };
}
export function searchIndex() {
  return catalog.products.filter(visible).map((p) => ({
    h: p.handle, t: p.title, k: p.type, p: Math.min(...p.variants.map((v) => v.price)), i: p.images[0]?.src || "",
  }));
}
