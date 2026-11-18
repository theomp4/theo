export const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Image Shopify redimensionnée par le CDN (évite de charger des originaux de plusieurs Mo) */
export function shopifyImg(src: string, width: number) {
  if (!src) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}width=${width}`;
}
