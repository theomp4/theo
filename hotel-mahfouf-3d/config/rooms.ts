// Les pièces de l'hôtel : chaque fenêtre cliquable ouvre une de ces boutiques.
// Pour renommer une pièce, changer sa catégorie ou la fenêtre qui y mène, il suffit de modifier cette liste.

export type RoomSource =
  | { kind: "latest"; count: number }                 // nouveautés : les derniers produits publiés
  | { kind: "collection"; handle: string }            // une collection Shopify
  | { kind: "collections"; handles: string[] };       // plusieurs collections réunies

export type RoomDecor = "dressing" | "boutique" | "salon" | "suite" | "rooftop" | "lobby";

export type Room = {
  slug: string;              // utilisé dans l'URL : /chambre/<slug>/
  number: string;            // affiché sur la plaque
  title: string;
  subtitle: string;
  source: RoomSource;
  decor: RoomDecor;
  palette: { wall: string; accent: string; fabric: string };
  // fenêtre de la façade qui mène à la pièce (voir lib/three/hotel.ts) :
  // étage (0 = rez-de-chaussée), et position le long de la façade en mètres depuis le centre de l'angle arrondi
  window: { floor: number; along: number } | "entrance" | "roof";
};

export const ROOMS: Room[] = [
  { slug: "lobby", number: "Lobby", title: "Le Lobby", subtitle: "Accueil et découverte de la maison", decor: "lobby",
    source: { kind: "collection", handle: "must-haves" }, palette: { wall: "#efe2d2", accent: "#d68fa0", fabric: "#b8475f" }, window: "entrance" },
  { slug: "101", number: "101", title: "Nouveautés", subtitle: "Les dernières pièces arrivées à l'hôtel", decor: "boutique",
    source: { kind: "latest", count: 14 }, palette: { wall: "#f3e6dc", accent: "#e3a3b2", fabric: "#c2566f" }, window: { floor: 1, along: 0 } },
  { slug: "102", number: "102", title: "Vêtements", subtitle: "Le dressing : manteaux, tailleurs, robes", decor: "dressing",
    source: { kind: "collection", handle: "le-dressing" }, palette: { wall: "#ead9c8", accent: "#c99a6b", fabric: "#8e2a3d" }, window: { floor: 1, along: -6.5 } },
  { slug: "103", number: "103", title: "Accessoires", subtitle: "Sacs, bijoux et petites attentions", decor: "salon",
    source: { kind: "collection", handle: "sacs-et-accessoires" }, palette: { wall: "#f1e4e4", accent: "#d98da0", fabric: "#a73a55" }, window: { floor: 1, along: 6.5 } },
  { slug: "201", number: "201", title: "Collections", subtitle: "Le Bureau, le Room Service, la Piscine, le Jardin…", decor: "suite",
    source: { kind: "collections", handles: ["le-bureau", "le-room-service", "pied-de-poule", "early-check-in-late-check-out", "le-jardin", "la-piscine"] },
    palette: { wall: "#e6dccd", accent: "#b99a5f", fabric: "#5f1a28" }, window: { floor: 2, along: -3.2 } },
  { slug: "202", number: "202", title: "Éditions limitées", subtitle: "Pièces uniques brodées de perles", decor: "boutique",
    source: { kind: "collection", handle: "pieces-uniques" }, palette: { wall: "#f4e9e2", accent: "#e7b4bf", fabric: "#9f3450" }, window: { floor: 2, along: 3.2 } },
  { slug: "rooftop", number: "Rooftop", title: "Le Rooftop", subtitle: "L'univers Hôtel Mahfouf : livres, art de la table, décoration", decor: "rooftop",
    source: { kind: "collections", handles: ["librairie-et-papeterie", "cuisine-et-bar", "decoration"] }, palette: { wall: "#f0d9cf", accent: "#f0a7b6", fabric: "#c75b77" }, window: "roof" },
];

export const roomBySlug = (slug: string) => ROOMS.find((r) => r.slug === slug);
