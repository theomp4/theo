// Récupère le catalogue public Shopify d'hotelmahfouf.com (produits + collections)
// et l'écrit dans data/catalog.json. À relancer pour mettre la maquette à jour : npm run sync
import { writeFile, mkdir } from "node:fs/promises";

const SHOP = "https://hotelmahfouf.com";
const ROOM_COLLECTIONS = [
  "le-dressing", "sacs-et-accessoires", "pieces-uniques", "must-haves", "cuisine-et-bar", "decoration",
  "librairie-et-papeterie", "le-bureau", "le-room-service", "la-piscine", "le-jardin", "le-chalet",
  "early-check-in-late-check-out", "pied-de-poule"
];

async function json(url) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(url + " → " + r.status);
  return r.json();
}
const text = (html) => (html || "")
  .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|div)>/gi, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "’").replace(/&quot;/g, "\"")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

function slim(p) {
  const optName = (n) => (n || "").toLowerCase();
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    type: p.product_type || "",
    vendor: p.vendor,
    tags: p.tags || [],
    publishedAt: p.published_at,
    description: text(p.body_html).slice(0, 1200),
    images: (p.images || []).slice(0, 8).map((i) => ({ src: i.src, w: i.width, h: i.height })),
    options: (p.options || []).filter((o) => o.name !== "Title").map((o) => ({ name: o.name, values: o.values })),
    variants: (p.variants || []).map((v) => ({
      id: v.id, title: v.title, available: v.available, price: Number(v.price),
      compareAt: v.compare_at_price ? Number(v.compare_at_price) : null,
      options: [v.option1, v.option2, v.option3].filter((x) => x && x !== "Default Title"),
    })),
    sizeOption: (p.options || []).findIndex((o) => /taille|size/.test(optName(o.name))),
  };
}

const all = [];
for (let page = 1; page < 10; page++) {
  const { products } = await json(`${SHOP}/products.json?limit=250&page=${page}`);
  if (!products.length) break;
  all.push(...products);
}
const products = all.map(slim);

// couleurs : les produits de même titre sont les déclinaisons couleur d'une même pièce
const byTitle = {};
for (const p of products) (byTitle[p.title] ||= []).push(p.handle);
for (const p of products) p.colorSiblings = byTitle[p.title].length > 1 ? byTitle[p.title] : [];

const collections = {};
for (const h of ROOM_COLLECTIONS) {
  try {
    const { products: list } = await json(`${SHOP}/collections/${h}/products.json?limit=250`);
    collections[h] = list.map((p) => p.handle);
  } catch (e) { console.warn("collection ignorée", h, e.message); }
}
const { collections: meta } = await json(`${SHOP}/collections.json?limit=250`);
const collectionInfo = Object.fromEntries(meta.filter((c) => collections[c.handle]).map((c) => [c.handle, { title: c.title, description: text(c.description).slice(0, 300) }]));

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/catalog.json", import.meta.url), JSON.stringify({ syncedAt: new Date().toISOString(), products, collections, collectionInfo }));
console.log(`catalogue : ${products.length} produits, ${Object.keys(collections).length} collections`);
