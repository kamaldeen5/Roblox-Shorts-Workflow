import React, { useEffect, useMemo, useRef } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { createRobloxWorld } from "../../shared/roblox-scene.mjs";

export interface Beat {
  id: string;
  duration: number;
  narration: string;
  emphasis?: string[];
  camera: { preset: string; fov?: number; shake?: number };
  actor: {
    name: string;
    scale: number;
    walkSpeed: number;
    headTiltX?: number;
    shirt: string;
    pants: string;
    skin: string;
    hair?: string;
    mood: string;
  };
  moon?: { color?: string; scale?: number; eyes?: boolean };
  popupText?: string;
  sfx?: string;
}

export interface EpisodeData {
  slug: string;
  title: string;
  hookBadge: string;
  fps: number;
  width: number;
  height: number;
  palette: Record<string, string>;
  audio?: { music?: string; musicVolume?: number };
  beats: Beat[];
}

function splitCaptionChunks(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 3) {
    chunks.push(words.slice(i, i + 3).join(" "));
  }
  return chunks;
}

export const RobloxShort: React.FC<{ episode: EpisodeData }> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const world = useMemo(() => createRobloxWorld(THREE, episode), [episode]);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(1);
    rendererRef.current = renderer;
    // Render immediately on mount so frame 0 and `remotion still` always draw the 3D scene
    world.updateAt(t);
    renderer.render(world.scene, world.camera);
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [width, height, world]);

  const state = world.updateAt(t);
  if (rendererRef.current) {
    rendererRef.current.render(world.scene, world.camera);
  }

  const beat = state.beat;
  const chunks = beat ? splitCaptionChunks(beat.narration) : [];
  const chunkIdx = beat
    ? Math.min(chunks.length - 1, Math.floor(state.progress * chunks.length))
    : 0;
  const activeChunk = chunks[chunkIdx] || "";
  const emphasisWords = (beat?.emphasis || []).join(" ").toLowerCase().split(/\s+/);

  const beatOffsets = useMemo(() => {
    let cur = 0;
    return episode.beats.map((b, index) => {
      const start = cur;
      cur += b.duration;
      return { beat: b, start, index };
    });
  }, [episode.beats]);

  const accent = episode.palette?.accent || "#facc15";

  return (
    <AbsoluteFill style={{ backgroundColor: episode.palette?.skyBottom || "#111936" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {episode.audio?.music ? (
        <Audio
          src={staticFile(`audio/${episode.audio.music.split("/").pop()}`)}
          volume={episode.audio.musicVolume ?? 0.22}
        />
      ) : null}

      {beatOffsets.map(({ beat: b, start, index }) =>
        b.sfx ? (
          <Sequence key={`${b.id}-sfx-${index}`} from={Math.max(0, Math.round(start * fps))}>
            <Audio src={staticFile(`audio/${b.sfx}.wav`)} volume={0.58} />
          </Sequence>
        ) : null
      )}

      {beatOffsets.map(({ beat: b, start, index }) => (
        <Sequence
          key={`${b.id}-vo-${index}`}
          from={Math.max(0, Math.round((start + 0.04) * fps))}
          durationInFrames={Math.max(1, Math.round((b.duration - 0.04) * fps))}
        >
          <Audio src={staticFile(`voiceover/${episode.slug}/beat-${index}.wav`)} volume={1.0} />
        </Sequence>
      ))}

      <div
        style={{
          position: "absolute",
          top: 325,
          left: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            backgroundColor: accent,
            color: "#0b1026",
            fontFamily: "Inter, Arial Black, sans-serif",
            fontWeight: 900,
            fontSize: 36,
            letterSpacing: 1.2,
            padding: "16px 32px",
            borderRadius: 18,
            border: "5px solid #0b1026",
            boxShadow: "0 10px 0 #0b1026",
          }}
        >
          {episode.hookBadge}
        </div>

        {beat?.popupText ? (
          <div
            style={{
              backgroundColor: "rgba(11, 16, 38, 0.94)",
              color: "#ffffff",
              fontFamily: "Inter, Arial, sans-serif",
              fontWeight: 800,
              fontSize: 30,
              padding: "12px 26px",
              borderRadius: 14,
              border: `3px solid ${accent}`,
            }}
          >
            {beat.popupText}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 690,
          left: 0,
          width: "100%",
          padding: "0 120px",
          boxSizing: "border-box",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "inline-block",
            maxWidth: 820,
            fontFamily: "Inter, Arial Black, sans-serif",
            fontWeight: 900,
            fontSize: 64,
            lineHeight: 1.15,
            textTransform: "uppercase",
            backgroundColor: "rgba(7, 11, 25, 0.72)",
            padding: "12px 26px",
            borderRadius: 18,
            textShadow: "0 6px 0 #070b19, 0 10px 24px rgba(0,0,0,0.85)",
          }}
        >
          {activeChunk.split(/\s+/).map((w, i) => {
            const clean = w.replace(/[^a-z0-9]/gi, "").toLowerCase();
            const isEmph = emphasisWords.includes(clean);
            return (
              <span
                key={`${i}-${w}`}
                style={{
                  color: isEmph ? accent : "#ffffff",
                  margin: "0 7px",
                  display: "inline-block",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
