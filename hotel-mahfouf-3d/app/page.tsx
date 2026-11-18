import Link from "next/link";
import { ROOMS } from "@/config/rooms";

// L'accueil : l'hôtel en 3D (dans le layout). Ce contenu sert au référencement et aux lecteurs d'écran.
export default function Home() {
  return (
    <nav className="sr" aria-label="Pièces de l'hôtel">
      <h2>Les pièces de l'Hôtel Mahfouf</h2>
      <ul>{ROOMS.map((r) => <li key={r.slug}><Link href={`/chambre/${r.slug}/`}>{r.number} — {r.title} : {r.subtitle}</Link></li>)}</ul>
    </nav>
  );
}
