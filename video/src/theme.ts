import { Easing, interpolate } from "remotion";

// DA Review Maker (reprise de la vidéo promo de la plaque)
export const C = {
  bg: "#F4F7FC",
  navy: "#0E1A3A",
  blue: "#4166B0",
  blueLight: "#6E8FD6",
  star: "#FBBC05",
  grey: "#6B7690",
  line: "#E3E9F4",
  white: "#FFFFFF",
};

export const fontFamily = "Poppins, sans-serif";

export const FPS = 60;
export const W = 1080;
export const H = 1920;

export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.5, 0, 0.75, 0),
};

// interpolation bornée sur le temps en secondes
export const tw = (
  t: number,
  range: [number, number],
  out: [number, number],
  ease: (x: number) => number = EASE.out,
) =>
  interpolate(t, range, out, {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const shadow = {
  card: "0 30px 60px -20px rgba(14,26,58,0.18), 0 8px 20px -8px rgba(14,26,58,0.10)",
  soft: "0 14px 34px -12px rgba(14,26,58,0.18)",
  device: "0 60px 120px -30px rgba(14,26,58,0.35), 0 20px 40px -20px rgba(14,26,58,0.25)",
};
