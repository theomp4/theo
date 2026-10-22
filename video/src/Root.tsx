import React from "react";
import { Composition } from "remotion";
import "./fonts.css"; // Poppins embarquée (pas de chargement réseau pendant le rendu)
import { DURATION, SitesWeb } from "./SitesWeb";
import { FPS, H, W } from "./theme";

export const Root: React.FC = () => (
  <Composition id="SitesWeb" component={SitesWeb} durationInFrames={DURATION * FPS} fps={FPS} width={W} height={H} />
);
