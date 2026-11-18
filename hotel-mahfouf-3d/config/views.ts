// Les trois points de vue de l'hôtel (images de référence) et la fenêtre qui mène à chaque pièce.
// Coordonnées en pixels de l'image d'origine (1672 × 941) : centre de la fenêtre, largeur, hauteur.
export const IMG_W = 1672, IMG_H = 941;

export type Spot = { x: number; y: number; w: number; h: number };
export type View = { id: string; src: string; sky: string; name: string; spots: Record<string, Spot> };

export const VIEWS: View[] = [
  { id: "2", src: "/references/hotel-2.webp", sky: "/references/hotel-2-sky.png", name: "Face à l'entrée",
    spots: {
      lobby: { x: 893, y: 795, w: 92, h: 100 }, rooftop: { x: 893, y: 128, w: 190, h: 70 },
      "101": { x: 893, y: 603, w: 46, h: 76 }, "102": { x: 760, y: 603, w: 46, h: 76 }, "103": { x: 1025, y: 603, w: 46, h: 76 },
      "201": { x: 760, y: 470, w: 46, h: 66 }, "202": { x: 1025, y: 470, w: 46, h: 66 },
    } },
  { id: "1", src: "/references/hotel-1.webp", sky: "/references/hotel-1-sky.png", name: "Depuis les toits",
    spots: {
      lobby: { x: 952, y: 812, w: 100, h: 95 }, rooftop: { x: 905, y: 140, w: 200, h: 70 },
      "101": { x: 935, y: 605, w: 52, h: 80 }, "102": { x: 805, y: 605, w: 50, h: 80 }, "103": { x: 1065, y: 605, w: 50, h: 80 },
      "201": { x: 805, y: 470, w: 50, h: 75 }, "202": { x: 1065, y: 470, w: 50, h: 75 },
    } },
  { id: "3", src: "/references/hotel-3.webp", sky: "/references/hotel-3-sky.png", name: "Le boulevard",
    spots: {
      lobby: { x: 897, y: 770, w: 100, h: 110 }, rooftop: { x: 840, y: 100, w: 260, h: 60 },
      "101": { x: 895, y: 532, w: 52, h: 70 }, "102": { x: 742, y: 532, w: 52, h: 70 }, "103": { x: 1025, y: 532, w: 52, h: 70 },
      "201": { x: 742, y: 398, w: 52, h: 66 }, "202": { x: 1025, y: 398, w: 52, h: 66 },
    } },
];

/** Photo d'intérieur de chaque pièce (photos Hôtel Mahfouf) et point d'intérêt du cadrage */
export const INTERIORS: Record<string, { src: string; focus: string; wide?: boolean }> = {
  lobby: { src: "/interiors/ex-lift.webp", focus: "50% 45%" },
  "101": { src: "/interiors/ex-books.webp", focus: "50% 50%" },
  "102": { src: "/interiors/ex-library.webp", focus: "45% 55%" },
  "103": { src: "/interiors/ex-green.webp", focus: "60% 50%" },
  "201": { src: "/interiors/ex-cloche.webp", focus: "50% 35%" },
  "202": { src: "/interiors/ex-night.webp", focus: "50% 50%" },
  rooftop: { src: "/interiors/rooftop.webp", focus: "55% 40%", wide: true },
};
