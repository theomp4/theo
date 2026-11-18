import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ROOMS, roomBySlug } from "@/config/rooms";
import { lite, productsForRoom } from "@/lib/catalog";
import RoomShop from "@/components/RoomShop";

export const dynamicParams = false;
export function generateStaticParams() { return ROOMS.map((r) => ({ slug: r.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = roomBySlug((await params).slug);
  return r ? { title: `${r.number === r.title ? "" : r.number + " · "}${r.title}`, description: `${r.subtitle}. Entrez dans la pièce et découvrez la sélection Hôtel Mahfouf.` } : {};
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const room = roomBySlug((await params).slug);
  if (!room) notFound();
  const products = productsForRoom(room).map(lite);
  return <RoomShop room={room} products={products} />;
}
