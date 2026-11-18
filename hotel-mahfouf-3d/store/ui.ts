"use client";
import { create } from "zustand";
import type { LiteProduct } from "@/lib/catalog";

type UI = {
  hover: string | null;              // pièce survolée sur la façade
  busy: boolean;                     // animation de caméra en cours (interface désactivée)
  veil: boolean;                     // fondu de transition entre façade et pièce
  fromRoom: string | null;           // pièce d'où l'on revient (la caméra ressort par sa fenêtre)
  sheet: LiteProduct | null;         // fiche produit ouverte
  roomProducts: LiteProduct[];       // produits exposés dans la pièce 3D courante
  hoverProduct: string | null;
  searchOpen: boolean;
  menuOpen: boolean;
  notice: string | null;
  enter: ((slug: string) => void) | null; // fourni par la scène de l'hôtel (vol caméra vers la fenêtre)
  set: (p: Partial<UI>) => void;
};
export const useUI = create<UI>((set) => ({
  hover: null, busy: false, veil: false, fromRoom: null, sheet: null, roomProducts: [], hoverProduct: null,
  searchOpen: false, menuOpen: false, notice: null, enter: null,
  set: (p) => set(p),
}));
