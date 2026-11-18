"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  variantId: number; handle: string; title: string; variantTitle: string; image: string; price: number; qty: number;
};

type CartState = {
  lines: CartLine[];
  open: boolean;
  add: (l: Omit<CartLine, "qty">, qty: number) => void;
  setQty: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  setOpen: (o: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      add: (l, qty) => set((s) => {
        const ex = s.lines.find((x) => x.variantId === l.variantId);
        const lines = ex ? s.lines.map((x) => (x.variantId === l.variantId ? { ...x, qty: Math.min(10, x.qty + qty) } : x)) : [...s.lines, { ...l, qty }];
        return { lines, open: true };
      }),
      setQty: (id, qty) => set((s) => ({ lines: s.lines.map((x) => (x.variantId === id ? { ...x, qty: Math.max(1, Math.min(10, qty)) } : x)) })),
      remove: (id) => set((s) => ({ lines: s.lines.filter((x) => x.variantId !== id) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: "hm-cart", partialize: (s) => ({ lines: s.lines }) }
  )
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.price, 0);
