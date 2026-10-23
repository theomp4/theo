// V3 : montage nerveux calé sur une musique 128 BPM (public/audio/soundtrack.wav).
import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Flash, Grain, Night, TOTAL_BEATS, b, kickPulse, useT } from "./core";
import { Drop, GoogleScene, Intro, Outro, Responsive, Showcase, Wall } from "./Scenes";

export const V3_DURATION = TOTAL_BEATS * (60 / 128);

export const SitesV3: React.FC = () => {
  const t = useT();
  const pulse = kickPulse(t, 4, 23.5) + kickPulse(t, 26, 31.75);
  const energy = t >= b(4) ? 0.6 + pulse * 0.4 : 0;
  return (
    <AbsoluteFill style={{ background: "#04060E" }}>
      <Night energy={energy} />
      <AbsoluteFill style={{ transform: `scale(${1 + pulse * 0.014})` }}>
        <Intro />
        <Drop />
        <Showcase />
        <Wall />
        <Responsive />
        <GoogleScene />
        <Outro />
      </AbsoluteFill>
      <Flash at={[b(4), b(32)]} dur={0.3} />
      <Flash at={[b(16), b(20), b(24), b(28)]} dur={0.16} max={0.35} />
      <Grain />
      <Audio src={staticFile("audio/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
