import React from "react";
import { Composition } from "remotion";
import { RobloxShort } from "./RobloxShort";
import activeEpisode from "./episodes/active-episode.json";

export const RemotionRoot: React.FC = () => {
  const totalSeconds = activeEpisode.beats.reduce(
    (sum: number, b: { duration: number }) => sum + b.duration,
    0
  );
  const fps = activeEpisode.fps || 30;
  const durationInFrames = Math.max(1, Math.round(totalSeconds * fps));

  return (
    <Composition
      id="RobloxShort"
      component={RobloxShort}
      durationInFrames={durationInFrames}
      fps={fps}
      width={activeEpisode.width || 1080}
      height={activeEpisode.height || 1920}
      defaultProps={{ episode: activeEpisode }}
    />
  );
};
