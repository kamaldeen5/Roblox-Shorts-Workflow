# Roblox Shorts Studio (`remotion` + `hyperframes`)

This workspace produces viral 9:16 Roblox-style **"In This Town / In This World"** Shorts using a single data-driven episode pipeline rendered deterministically by **both** HyperFrames and Remotion.

## Architecture

- `episodes/*.json` — Story definitions (hook rule, beats, narration, emphasis keywords, camera presets, Roblox character state, SFX).
- `shared/roblox-scene.mjs` — Shared deterministic Three.js blocky Roblox town & R6 character engine (used identically by HyperFrames and Remotion).
- `scripts/generate-sfx.mjs` — Generates procedural WAV SFX (`pop.wav`, `ding.wav`, `whoosh.wav`, `boom.wav`) and `ambient_eerie.wav` into `shared-assets/audio/`.
- `scripts/build-episode.mjs` — Compiles an `episodes/<slug>.json` into:
  1. `hyperframes-project/` (`index.html`, `compositions/scene-3d.html`, `compositions/hud.html`, `compositions/captions.html`, `assets/`)
  2. `remotion-studio/src/episodes/active-episode.json` (+ `public/audio/`)
- `hyperframes-project/` — Agent-native HTML/GSAP + hosted Three.js (`hf-seek`) project for HyperFrames Studio, `check --json`, `snapshot`, TTS/captions, and fast MP4 rendering.
- `remotion-studio/` — React + TypeScript Remotion project (`RobloxShort`) for Remotion Studio scrubbing, React overlays, and `@remotion/cli` rendering.

## Standard Workflow

1. Create or edit `episodes/<slug>.json`.
2. Build for both engines:
   ```powershell
   npm run episode:build -- episodes/<slug>.json
   ```
3. Validate & preview in HyperFrames:
   ```powershell
   npm run hf:lint
   npm run hf:check
   npm run hf:snapshot
   npm run hf:render
   ```
4. Or preview / render in Remotion:
   ```powershell
   npm run remotion:studio
   npm run remotion:render
   ```
5. Porting custom Remotion React scenes to HyperFrames HTML: use the `remotion-to-hyperframes` skill in `.agents/skills/`.
