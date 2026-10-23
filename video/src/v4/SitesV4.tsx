// V4 : plus pro et un peu plus posée que la V3 (120 BPM), sites d'exemple animés.
import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Flash, Grain, Night, TOTAL_BEATS, b, kickPulse, useT } from "./core";
import { Drop, GoogleScene, Intro, Outro, Responsive, Showcase, Wall } from "./Scenes";

export const V4_DURATION = TOTAL_BEATS * (60 / 120);

export const SitesV4: React.FC = () => {
  const t = useT();
  const pulse = kickPulse(t, 4, 31.4) + kickPulse(t, 34, 39.75);
  const energy = t >= b(4) ? 0.55 + pulse * 0.3 : 0;
  return (
    <AbsoluteFill style={{ background: "#04060E" }}>
      <Night energy={energy} />
      <AbsoluteFill style={{ transform: `scale(${1 + pulse * 0.007})` }}>
        <Intro />
        <Drop />
        <Showcase />
        <Wall />
        <Responsive />
        <GoogleScene />
        <Outro />
      </AbsoluteFill>
      <Flash at={[b(4), b(40)]} dur={0.35} max={0.55} />
      <Grain />
      <Audio src={staticFile("audio/soundtrack-v4.wav")} />
    </AbsoluteFill>
  );
};
