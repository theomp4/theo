import React from "react";
import { Composition } from "remotion";
import "./fonts.css"; // Poppins embarquée (pas de chargement réseau pendant le rendu)
import { DURATION, SitesWeb } from "./SitesWeb";
import { FPS, H, W } from "./theme";
import { SitesV3, V3_DURATION } from "./v3/SitesV3";
import { SitesV4, V4_DURATION } from "./v4/SitesV4";

export const Root: React.FC = () => (
  <>
    <Composition id="SitesWeb" component={SitesWeb} durationInFrames={DURATION * FPS} fps={FPS} width={W} height={H} />
    <Composition id="SitesV3" component={SitesV3} durationInFrames={Math.ceil(V3_DURATION * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="SitesV4" component={SitesV4} durationInFrames={Math.ceil(V4_DURATION * FPS)} fps={FPS} width={W} height={H} />
  </>
);
