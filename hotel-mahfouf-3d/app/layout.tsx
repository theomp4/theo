import type { Metadata, Viewport } from "next";
import "./globals.css";
import PhotoExperience from "@/components/PhotoExperience";
import { CartDrawer, Header, HotelHUD, Notice, Search, Sheet } from "@/components/Overlays";

export const metadata: Metadata = {
  title: { default: "Hôtel Mahfouf — l'hôtel boutique", template: "%s · Hôtel Mahfouf" },
  description: "Entrez dans l'Hôtel Mahfouf : un hôtel parisien animé dont chaque fenêtre ouvre une boutique. Maquette de présentation.",
  openGraph: { title: "Hôtel Mahfouf", description: "Visitez l'hôtel, choisissez une fenêtre, entrez dans la boutique.", images: ["/references/hotel-2.webp"], locale: "fr_FR", type: "website" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1a1210" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Inter+Tight:wght@400;500;600&display=swap" />
        <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="" />
      </head>
      <body>
        <PhotoExperience />
        <div className="maquette" role="note">Maquette de présentation · Concept non officiel</div>
        <Header />
        <HotelHUD />
        <main className="page">{children}</main>
        <Sheet />
        <CartDrawer />
        <Search />
        <Notice />
      </body>
    </html>
  );
}
