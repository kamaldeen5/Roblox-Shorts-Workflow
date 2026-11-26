---
name: roblox-in-this-town-shorts
description: >-
  Create, customize, validate, and render viral 9:16 Roblox-style "In This Town / In This World"
  story Shorts using the unified Remotion + HyperFrames pipeline.
---

# Roblox "In This Town / In This World" Shorts Workflow

Use this skill whenever the user wants to create a new Roblox-style Shorts episode, tweak pacing/captions/camera presets, add voiceover/SFX, or render with HyperFrames and/or Remotion.

## Viral Story Formula (20–30 seconds, 9:16 1080×1920 @ 30fps)

1. **Hook (0–3.2s):** Start immediately with *"In this town..."* or *"In this world..."* plus a bizarre rule. Display `hookBadge` at the top (`RULE #1: ...`) and land a `ding` or `pop` SFX.
2. **Setup (3–6.5s):** Name the protagonist (e.g., Leo, Maya) and show their normal state (`close-up-face` camera).
3. **Rule Trigger & Escalation (6.5–14s):** Character breaks or tests the rule. Use `dramatic-zoom` and `low-angle-tower`, increase `actor.scale` or change `actor.mood`, fire `pop` SFX, and show a live counter in `popupText`.
4. **Climax (14–18s):** Push the consequence to an absurd extreme (`sky-titan` camera, `shake: 0.25`, `boom` SFX).
5. **Twist & Loop Ending (18–24s):** Introduce a second character or ironic reversal (`mayor-closeup` -> `rocket-up`), ending on a punchy visual that loops cleanly back to the hook.

## Camera Presets (`shared/roblox-scene.mjs`)

- `wide-town` — Establishing street pan showing blocky houses and streetlamps
- `close-up-face` — Tight character face shot with subtle push-in
- `dramatic-zoom` — Dynamic zoom synced to character growth/reaction
- `low-angle-tower` — Looking up from street level as character towers over streetlights
- `sky-titan` — Wide upward tilt past clouds and moon
- `mayor-closeup` — Cutaway tight shot for twist character
- `rocket-up` — High-speed upward tracking shot

## Fast Execution Commands

```powershell
# 1. Build episode into both HyperFrames & Remotion
npm run episode:build -- episodes/<slug>.json

# 2. Gate check + visual snapshots in HyperFrames
npm run hf:lint
npm run hf:check
npm run hf:snapshot

# 3. Render final MP4 (HyperFrames or Remotion)
npm run hf:render
npm run remotion:render
```

## HyperFrames Safety Rules

- Keep captions in the 9:16 safe zone (`bottom: 690px` on 1080×1920) so YouTube Shorts / TikTok UI never covers them.
- Never use `requestAnimationFrame`, `Date.now()`, or unseeded `Math.random()` inside `scene-3d.html`. Always drive Three.js from `hf-seek` (`e.detail.time`) and `mulberry32`.
- Keep host `id`, `#root[data-composition-id]`, and `window.__timelines[id]` identical (`scene-3d`, `hud`, `captions`).
