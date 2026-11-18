import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allProducts, getProduct, lite } from "@/lib/catalog";
import { ROOMS } from "@/config/rooms";
import ProductPurchase from "@/components/ProductPurchase";
import Gallery from "@/components/Gallery";

export const dynamicParams = false;
export function generateStaticParams() { return allProducts().filter((p) => p.images.length).map((p) => ({ handle: p.handle })); }

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const p = getProduct((await params).handle);
  return p ? { title: p.title, description: p.description.slice(0, 160), openGraph: { images: p.images.slice(0, 1).map((i) => i.src) } } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const raw = getProduct((await params).handle);
  if (!raw) notFound();
  const p = lite(raw);
  return (
    <article className="pdp">
      <Gallery images={p.images} title={p.title} />
      <div className="pdp-info">
        <Link href="/" className="lnk">← Retour à l'hôtel</Link>
        <span className="lab muted">{p.type || "Hôtel Mahfouf"}</span>
        <h1>{p.title}</h1>
        <ProductPurchase p={p} />
        {p.description && <div className="desc">{p.description.split("\n").map((l, i) => <p key={i}>{l}</p>)}</div>}
        <div className="pdp-rooms"><span className="lab muted">Continuer la visite</span>{ROOMS.slice(1, 6).map((r) => <Link key={r.slug} href={`/chambre/${r.slug}/`}>{r.number} · {r.title}</Link>)}</div>
      </div>
    </article>
  );
}
