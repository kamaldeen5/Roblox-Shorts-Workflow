/**
 * Episode Compiler: takes any episodes/<slug>.json and builds BOTH:
 *   1. hyperframes-project/ (HTML + GSAP + hosted Three.js + captions + voiceover + audio)
 *   2. remotion-studio/src/episodes/active-episode.json (+ public/audio & voiceover sync)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const episodeArg = process.argv[2] || "episodes/sample-10s.json";
const episodePath = path.isAbsolute(episodeArg) ? episodeArg : path.resolve(ROOT, episodeArg);

if (!fs.existsSync(episodePath)) {
  console.error(`Episode file not found: ${episodePath}`);
  process.exit(1);
}

const episode = JSON.parse(fs.readFileSync(episodePath, "utf8"));
const width = episode.width || 1080;
const height = episode.height || 1920;
const fps = episode.fps || 30;
const accent = episode.palette?.accent || "#facc15";
const skyBottom = episode.palette?.skyBottom || "#111936";

// Compute beat timings
let cursor = 0;
const timedBeats = episode.beats.map((b, idx) => {
  const start = Number(cursor.toFixed(3));
  const duration = Number(b.duration.toFixed(3));
  cursor += duration;
  return { ...b, index: idx, start, duration, end: Number(cursor.toFixed(3)) };
});
const totalDuration = Number(cursor.toFixed(3));

function escHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function splitCaptionChunks(text) {
  const words = text.trim().split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += 3) {
    chunks.push(words.slice(i, i + 3).join(" "));
  }
  return chunks;
}

function readWavDuration(file) {
  try {
    const buf = fs.readFileSync(file);
    const byteRate = buf.readUInt32LE(28);
    let offset = 12;
    while (offset + 8 <= buf.length) {
      const id = buf.toString("ascii", offset, offset + 4);
      const size = buf.readUInt32LE(offset + 4);
      if (id === "data") {
        return Number((size / byteRate).toFixed(3));
      }
      offset += 8 + size + (size % 2);
    }
    return 2.0;
  } catch {
    return 2.0;
  }
}

// 1. Sync Remotion episode + audio + voiceover
const remotionEpDir = path.join(ROOT, "remotion-studio", "src", "episodes");
const remotionAudioDir = path.join(ROOT, "remotion-studio", "public", "audio");
const remotionVoDir = path.join(ROOT, "remotion-studio", "public", "voiceover", episode.slug);
fs.mkdirSync(remotionEpDir, { recursive: true });
fs.mkdirSync(remotionAudioDir, { recursive: true });
fs.mkdirSync(remotionVoDir, { recursive: true });
fs.writeFileSync(
  path.join(remotionEpDir, "active-episode.json"),
  JSON.stringify(episode, null, 2)
);

// 2. Prepare HyperFrames directories & shared assets
const hfRoot = path.join(ROOT, "hyperframes-project");
const hfCompDir = path.join(hfRoot, "compositions");
const hfAssetsJs = path.join(hfRoot, "assets", "js");
const hfAssetsVendor = path.join(hfRoot, "assets", "vendor");
const hfAssetsAudio = path.join(hfRoot, "assets", "audio");
const hfAssetsVo = path.join(hfRoot, "assets", "voiceover", episode.slug);
const hfAssetsData = path.join(hfRoot, "assets", "data");

for (const d of [hfCompDir, hfAssetsJs, hfAssetsVendor, hfAssetsAudio, hfAssetsVo, hfAssetsData]) {
  fs.mkdirSync(d, { recursive: true });
}

fs.copyFileSync(
  path.join(ROOT, "shared", "roblox-scene.mjs"),
  path.join(hfAssetsJs, "roblox-scene.mjs")
);
fs.writeFileSync(path.join(hfAssetsData, "episode.json"), JSON.stringify(episode, null, 2));

const threeSrc = path.join(hfRoot, "node_modules", "three", "build", "three.module.js");
const threeCoreSrc = path.join(hfRoot, "node_modules", "three", "build", "three.core.js");
const gsapSrc = path.join(hfRoot, "node_modules", "gsap", "dist", "gsap.min.js");
if (fs.existsSync(threeSrc)) {
  fs.copyFileSync(threeSrc, path.join(hfAssetsVendor, "three.module.js"));
}
if (fs.existsSync(threeCoreSrc)) {
  fs.copyFileSync(threeCoreSrc, path.join(hfAssetsVendor, "three.core.js"));
}
if (fs.existsSync(gsapSrc)) {
  fs.copyFileSync(gsapSrc, path.join(hfAssetsVendor, "gsap.min.js"));
}

const sharedAudioDir = path.join(ROOT, "shared-assets", "audio");
if (fs.existsSync(sharedAudioDir)) {
  for (const file of fs.readdirSync(sharedAudioDir)) {
    if (file.endsWith(".wav") || file.endsWith(".mp3")) {
      fs.copyFileSync(path.join(sharedAudioDir, file), path.join(hfAssetsAudio, file));
      fs.copyFileSync(path.join(sharedAudioDir, file), path.join(remotionAudioDir, file));
    }
  }
}

const sharedVoDir = path.join(ROOT, "shared-assets", "voiceover", episode.slug);
const voTracks = [];
if (fs.existsSync(sharedVoDir)) {
  for (const b of timedBeats) {
    const voFile = `beat-${b.index}.wav`;
    const srcVo = path.join(sharedVoDir, voFile);
    if (fs.existsSync(srcVo)) {
      fs.copyFileSync(srcVo, path.join(hfAssetsVo, voFile));
      fs.copyFileSync(srcVo, path.join(remotionVoDir, voFile));
      const rawDur = readWavDuration(srcVo);
      const maxSlot = Number(Math.max(0.2, Math.min(rawDur, b.duration - 0.05)).toFixed(3));
      voTracks.push({ index: b.index, file: voFile, start: Number((b.start + 0.04).toFixed(3)), duration: maxSlot });
    }
  }
}

// ---------------------------------------------------------------------------
// 3. compositions/scene-3d.html
// Plain HTML (no <template>) loaded in an iframe by HF's local HTTP server.
// GSAP loaded via script tag (HF only injects GSAP into the root page, not iframes).
// importmap resolves "three" and roblox-scene relative to compositions/ directory.
// ---------------------------------------------------------------------------
const scene3dLines = [
  "<!doctype html>",
  "<html>",
  "<head>",
  '  <meta charset="utf-8">',
  '  <script src="../assets/vendor/gsap.min.js"></script>',
  '  <script type="importmap">{"imports":{"three":"../assets/vendor/three.module.js","./roblox-scene.mjs":"../assets/js/roblox-scene.mjs"}}</script>',
  "  <style>",
  "    * { box-sizing: border-box; margin: 0; padding: 0; }",
  `    html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: ${skyBottom}; }`,
  "    #roblox-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }",
  "  </style>",
  "</head>",
  "<body>",
  `  <div id="root" data-composition-id="scene-3d" data-width="${width}" data-height="${height}">`,
  `    <canvas id="roblox-canvas" width="${width}" height="${height}"></canvas>`,
  "  </div>",
  '  <script type="module">',
  '    import * as THREE from "three";',
  '    import { createRobloxWorld } from "./roblox-scene.mjs";',
  `    const episode = ${JSON.stringify(episode)};`,
  '    const canvas = document.getElementById("roblox-canvas");',
  "    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });",
  `    renderer.setSize(${width}, ${height}, false);`,
  "    renderer.setPixelRatio(1);",
  "    const world = createRobloxWorld(THREE, episode);",
  "    function renderAt(t) { world.updateAt(t); renderer.render(world.scene, world.camera); }",
  '    window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));',
  "    renderAt(0);",
  "    const tl = gsap.timeline({ paused: true });",
  `    tl.to({}, { duration: ${totalDuration} }, 0);`,
  "    window.__timelines = window.__timelines || {};",
  '    window.__timelines["scene-3d"] = tl;',
  "  </script>",
  "</body>",
  "</html>",
];
fs.writeFileSync(path.join(hfCompDir, "scene-3d.html"), scene3dLines.join("\n"));

// ---------------------------------------------------------------------------
// 4. compositions/hud.html — rule badge + stat popup chips
// ---------------------------------------------------------------------------
const hudPopupsHtml = timedBeats
  .filter((b) => b.popupText)
  .map(
    (b) => `    <div id="hud-popup-${b.index}" class="clip hud-popup-wrap" data-start="${b.start}" data-duration="${b.duration}">
      <div class="hud-popup-inner">${escHtml(b.popupText)}</div>
    </div>`
  )
  .join("\n");

const hudPopupsTweens = timedBeats
  .filter((b) => b.popupText)
  .map((b) => {
    const exitAt = Math.max(b.start + 0.25, Number((b.end - 0.16).toFixed(3)));
    return `  tl.fromTo("#hud-popup-${b.index} .hud-popup-inner",
    { opacity: 0, y: -14, scale: 0.88 },
    { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: "back.out(1.8)" }, ${b.start});
  tl.to("#hud-popup-${b.index} .hud-popup-inner",
    { opacity: 0, y: -10, duration: 0.14, ease: "power2.in" }, ${exitAt});`;
  })
  .join("\n");

const hudLines = [
  "<!doctype html>",
  "<html>",
  "<head>",
  '  <meta charset="utf-8">',
  '  <script src="../assets/vendor/gsap.min.js"></script>',
  "  <style>",
  "    * { box-sizing: border-box; margin: 0; padding: 0; }",
  `    html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: transparent; }`,
  '    #root { position: absolute; inset: 0; pointer-events: none; font-family: Inter, "Arial Black", sans-serif; }',
  "    .hud-rule-wrap { position: absolute; top: 325px; left: 0; width: 100%; display: flex; justify-content: center; }",
  `    .hud-rule-badge { background: ${accent}; color: #0b1026; font-weight: 900; font-size: 36px; letter-spacing: 1.2px; padding: 16px 32px; border-radius: 18px; border: 5px solid #0b1026; box-shadow: 0 10px 0 #0b1026; text-align: center; }`,
  "    .hud-popup-wrap { position: absolute; top: 430px; left: 0; width: 100%; display: flex; justify-content: center; }",
  `    .hud-popup-inner { background: rgba(11,16,38,0.94); color: #fff; font-weight: 800; font-size: 30px; padding: 12px 26px; border-radius: 14px; border: 3px solid ${accent}; text-align: center; }`,
  "  </style>",
  "</head>",
  "<body>",
  `  <div id="root" data-composition-id="hud" data-width="${width}" data-height="${height}">`,
  `    <div id="hud-rule" class="clip hud-rule-wrap" data-start="0.05" data-duration="${Math.max(0.5, totalDuration - 0.1)}">`,
  `      <div class="hud-rule-badge" data-var-text="hookBadge">${escHtml(episode.hookBadge)}</div>`,
  "    </div>",
  hudPopupsHtml,
  "  </div>",
  "  <script>",
  "    var tl = gsap.timeline({ paused: true });",
  '    tl.fromTo("#hud-rule .hud-rule-badge",',
  "      { opacity: 0, y: -24, scale: 0.9 },",
  '      { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: "back.out(1.6)" }, 0.05);',
  hudPopupsTweens,
  "    window.__timelines = window.__timelines || {};",
  '    window.__timelines["hud"] = tl;',
  "  </script>",
  "</body>",
  "</html>",
];
fs.writeFileSync(path.join(hfCompDir, "hud.html"), hudLines.join("\n"));

// ---------------------------------------------------------------------------
// 5. compositions/captions.html — viral kinetic word-by-word captions
// ---------------------------------------------------------------------------
const captionClips = [];
const captionTweens = [];
let capIdx = 0;

for (const b of timedBeats) {
  const chunks = splitCaptionChunks(b.narration);
  const emphasisSet = new Set(
    (b.emphasis || [])
      .join(" ")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  );
  const beatPadStart = b.index === 0 ? 0.12 : 0.0;
  const usableDur = Math.max(0.4, b.duration - beatPadStart - 0.04);
  const sliceDur = usableDur / chunks.length;

  for (let c = 0; c < chunks.length; c++) {
    const start = Number((b.start + beatPadStart + c * sliceDur).toFixed(3));
    const dur = Number(Math.max(0.25, sliceDur - 0.02).toFixed(3));
    const end = Number((start + dur).toFixed(3));
    const id = `cap-${capIdx++}`;

    const wordsHtml = chunks[c]
      .split(/\s+/)
      .map((w) => {
        const clean = w.replace(/[^a-z0-9]/gi, "").toLowerCase();
        const cls = emphasisSet.has(clean) ? "cap-word cap-emph" : "cap-word";
        return `<span class="${cls}">${escHtml(w)}</span>`;
      })
      .join(" ");

    captionClips.push(
      `    <div id="${id}" class="clip cap-group" data-start="${start}" data-duration="${dur}">
      <div class="cap-inner">${wordsHtml}</div>
    </div>`
    );

    const fadeOutAt = Math.max(start + 0.12, Number((end - 0.1).toFixed(3)));
    captionTweens.push(
      `  tl.fromTo("#${id} .cap-inner",
    { opacity: 0, y: 18, scale: 0.88 },
    { opacity: 1, y: 0, scale: 1, duration: 0.13, ease: "back.out(1.9)" }, ${start});
  tl.to("#${id} .cap-inner",
    { opacity: 0, duration: 0.08, ease: "power2.in" }, ${fadeOutAt});`
    );
  }
}

const captionsLines = [
  "<!doctype html>",
  "<html>",
  "<head>",
  '  <meta charset="utf-8">',
  '  <script src="../assets/vendor/gsap.min.js"></script>',
  "  <style>",
  "    * { box-sizing: border-box; margin: 0; padding: 0; }",
  `    html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: transparent; }`,
  "    #root { position: absolute; inset: 0; pointer-events: none; overflow: visible; }",
  "    .cap-group { position: absolute; bottom: 690px; left: 0; width: 100%; padding: 0 120px; box-sizing: border-box; text-align: center; overflow: visible; }",
  `    .cap-inner { display: inline-block; max-width: 820px; font-family: Inter, "Arial Black", sans-serif; font-weight: 900; font-size: 64px; line-height: 1.15; text-transform: uppercase; color: #fff; background: rgba(7,11,25,0.72); padding: 12px 26px; border-radius: 18px; -webkit-text-stroke: 3px #070b19; paint-order: stroke fill; text-shadow: 0 6px 0 #070b19, 0 10px 24px rgba(0,0,0,0.85); overflow: visible; }`,
  "    .cap-word { display: inline-block; margin: 0 7px; }",
  `    .cap-emph { color: ${accent}; }`,
  "  </style>",
  "</head>",
  "<body>",
  `  <div id="root" data-composition-id="captions" data-width="${width}" data-height="${height}">`,
  captionClips.join("\n"),
  "  </div>",
  "  <script>",
  "    var tl = gsap.timeline({ paused: true });",
  captionTweens.join("\n"),
  "    window.__timelines = window.__timelines || {};",
  '    window.__timelines["captions"] = tl;',
  "  </script>",
  "</body>",
  "</html>",
];
fs.writeFileSync(path.join(hfCompDir, "captions.html"), captionsLines.join("\n"));

// ---------------------------------------------------------------------------
// 6. Root index.html — mounts sub-compositions + audio tracks
// ---------------------------------------------------------------------------
const sfxAudioTags = timedBeats
  .filter((b) => b.sfx)
  .map((b, i) => {
    const audioFile = `assets/audio/${b.sfx}.wav`;
    const sfxDur = b.sfx === "boom" ? 0.95 : b.sfx === "ding" ? 0.65 : b.sfx === "whoosh" ? 0.36 : 0.18;
    const clampedDur = Number(Math.min(sfxDur, Math.max(0.2, totalDuration - b.start - 0.05)).toFixed(3));
    return `      <audio
        id="sfx-${i}"
        class="clip"
        src="${audioFile}"
        data-start="${Number((b.start + 0.03).toFixed(3))}"
        data-duration="${clampedDur}"
        data-track-index="4"
        data-track-kind="audio"
        data-volume="0.58"
      ></audio>`;
  })
  .join("\n");

const voAudioTags = voTracks
  .map(
    (v) => `      <audio
        id="vo-${v.index}"
        class="clip"
        src="assets/voiceover/${episode.slug}/${v.file}"
        data-start="${v.start}"
        data-duration="${v.duration}"
        data-track-index="5"
        data-track-kind="audio"
        data-volume="1.0"
      ></audio>`
  )
  .join("\n");

const varsJson = JSON.stringify([
  { id: "hookBadge", type: "string", label: "Hook Rule Badge", default: episode.hookBadge },
  { id: "accentColor", type: "color", label: "Accent Color", default: accent },
]);

const indexLines = [
  "<!doctype html>",
  `<html lang="en" data-composition-variables='${escHtml(varsJson)}'>`,
  "  <head>",
  '    <meta charset="utf-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
  `    <title>${escHtml(episode.title)}</title>`,
  "    <style>",
  "      * { box-sizing: border-box; }",
  `      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: ${skyBottom}; overflow: hidden; }`,
  `      :root { --accentColor: ${accent}; }`,
  "    </style>",
  "  </head>",
  "  <body>",
  "    <div",
  '      id="root"',
  '      data-composition-id="main"',
  "      data-no-timeline",
  '      data-start="0"',
  `      data-duration="${totalDuration}"`,
  `      data-width="${width}"`,
  `      data-height="${height}"`,
  `      data-fps="${fps}"`,
  "    >",
  "      <div",
  '        id="scene-3d"',
  '        data-composition-id="scene-3d"',
  '        data-composition-src="compositions/scene-3d.html"',
  '        data-start="0"',
  `        data-duration="${totalDuration}"`,
  `        data-width="${width}"`,
  `        data-height="${height}"`,
  '        data-track-index="0"',
  '        data-track-kind="graphics"',
  '        style="position: absolute; inset: 0; z-index: 1;"',
  "      ></div>",
  "      <div",
  '        id="hud"',
  '        data-composition-id="hud"',
  '        data-composition-src="compositions/hud.html"',
  '        data-start="0"',
  `        data-duration="${totalDuration}"`,
  `        data-width="${width}"`,
  `        data-height="${height}"`,
  '        data-track-index="1"',
  '        data-track-kind="graphics"',
  '        style="position: absolute; inset: 0; z-index: 20;"',
  "      ></div>",
  "      <div",
  '        id="captions"',
  '        data-composition-id="captions"',
  '        data-composition-src="compositions/captions.html"',
  '        data-start="0"',
  `        data-duration="${totalDuration}"`,
  `        data-width="${width}"`,
  `        data-height="${height}"`,
  '        data-track-index="2"',
  '        data-track-kind="captions"',
  '        style="position: absolute; inset: 0; z-index: 30;"',
  "      ></div>",
  "      <audio",
  '        id="bg-music"',
  '        class="clip"',
  `        src="${episode.audio?.music || "assets/audio/ambient_eerie.wav"}"`,
  '        data-start="0"',
  `        data-duration="${totalDuration}"`,
  '        data-track-index="3"',
  '        data-track-kind="audio"',
  `        data-volume="${episode.audio?.musicVolume ?? 0.2}"`,
  "      ></audio>",
  sfxAudioTags,
  voAudioTags,
  "    </div>",
  "  </body>",
  "</html>",
];
fs.writeFileSync(path.join(hfRoot, "index.html"), indexLines.join("\n"));

console.log(`Built episode "${episode.slug}" (${totalDuration}s, ${timedBeats.length} beats, ${voTracks.length} VO tracks) for HyperFrames & Remotion.`);
