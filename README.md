# 🎮 Roblox Shorts Studio

> **Dual-render pipeline** (HyperFrames + Remotion) for creating viral **"In This Town…"** Roblox-style YouTube Shorts — 1080×1920, 30fps, TikTok/YT-ready.

---

## ✨ What It Does

| Feature | Detail |
|---|---|
| 🏙️ 3D Roblox town | Three.js R6 character + procedural buildings |
| 🎙️ Viral TTS | Edge Neural TTS (`en-US-BrianNeural`, +16Hz pitch, +22% rate) |
| 🎵 Synth bed | 128 BPM arpeggio matching viral pacing |
| 💥 SFX | pop / ding / whoosh / boom — programmatically generated |
| 🎬 Dual render | HyperFrames (GPU, faster) **and** Remotion (React, composable) |
| 🔊 Mastered audio | FFmpeg chain → −13.5 LUFS (matches viral references) |

---

## 🖥️ Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org) |
| **FFmpeg** | Gyan full build | See [FFmpeg note](#-ffmpeg-requirement) below |
| **Git** | any | For cloning |
| **Windows** | 10/11 | Linux/Mac: minor path tweaks needed |

> **IMPORTANT:** FFmpeg **must** be the Gyan full build (not the stripped Remotion/BtbN build).  
> The HyperFrames audio mixer requires the `pcm_f32le` encoder which is missing from stripped builds.

---

## 🚀 Quick Start

```powershell
# 1. Clone
git clone https://github.com/kamaldeen5/Roblox-Shorts-Workflow.git
cd Roblox-Shorts-Workflow

# 2. Install all dependencies
node scripts/setup.mjs

# 3. Generate SFX + music bed (one-time, stored in shared-assets/audio/)
node scripts/generate-sfx.mjs

# 4. Generate voiceover for the sample episode
node scripts/generate-tts.mjs episodes/sample-10s.json

# 5. Build HyperFrames + Remotion projects
node scripts/build-episode.mjs episodes/sample-10s.json

# 6. Render with HyperFrames (GPU accelerated)
cd hyperframes-project
npx hyperframes render --quality draft --output renders/sample-10s-hf.mp4

# OR render with Remotion (React-based)
cd ../remotion-studio
npx remotion render src/index.ts RobloxShort out/sample-10s-remotion.mp4 --concurrency=2
```

---

## 🔊 FFmpeg Requirement

HyperFrames needs the **Gyan full build** of FFmpeg:

**Option A — npm (easiest):**
```powershell
cd hyperframes-project
npm install ffmpeg-static
# Then set env var before rendering:
$env:HYPERFRAMES_FFMPEG_PATH = "$PWD\node_modules\ffmpeg-static\ffmpeg.exe"
```

**Option B — Manual download:**
1. Download from [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) → `ffmpeg-release-full.7z`
2. Extract and put `ffmpeg.exe` + `ffprobe.exe` in your PATH  
   (e.g. `C:\tools\ffmpeg\bin\`)
3. Set env var: `$env:HYPERFRAMES_FFMPEG_PATH = "C:\tools\ffmpeg\bin\ffmpeg.exe"`

---

## 📁 Project Structure

```
roblox-shorts-studio/
├── episodes/
│   └── sample-10s.json        <- Episode spec (beats, voice, captions)
├── scripts/
│   ├── setup.mjs              <- One-shot installer
│   ├── generate-sfx.mjs       <- Creates SFX + music bed WAVs
│   ├── generate-tts.mjs       <- Edge Neural TTS -> mastered WAVs
│   ├── build-episode.mjs      <- Compiles everything into HF + Remotion
│   └── doctor.mjs             <- Checks all tool dependencies
├── shared/
│   └── roblox-scene.mjs       <- Three.js R6 character + town engine
├── shared-assets/
│   └── audio/                 <- Generated SFX (committed for OOTB use)
├── hyperframes-project/
│   ├── hyperframes.json       <- HyperFrames project config
│   └── package.json
└── remotion-studio/
    ├── src/
    │   ├── index.ts
    │   └── RobloxShort.tsx
    ├── remotion.config.ts
    └── package.json
```

---

## 🎬 Episode Format

Episodes are defined in `episodes/*.json`:

```json
{
  "id": "my-episode",
  "title": "In This Town, There Are NO Rules",
  "durationSeconds": 10,
  "voice": {
    "name": "en-US-BrianNeural",
    "pitch": "+16Hz",
    "rate": "+22%"
  },
  "beats": [
    { "time": 0,   "text": "In this town...",       "sfx": "whoosh", "caption": "In this town..." },
    { "time": 2.5, "text": "there are NO rules.",   "sfx": "pop",    "caption": "there are NO rules." },
    { "time": 5.0, "text": "Everyone knows you.",   "sfx": "ding",   "caption": "Everyone knows you." },
    { "time": 7.5, "text": "And they're watching.", "sfx": "boom",   "caption": "And they're watching." }
  ]
}
```

**Voice options** (all free, no API key needed):
- `en-US-BrianNeural` — deep male, viral-tuned (recommended)
- `en-US-AriaNeural` — female voice
- `en-US-GuyNeural` — casual male
- pitch: `-50Hz` to `+50Hz` | rate: `-50%` to `+100%`

---

## 🛠️ Full Workflow Commands

```powershell
# Check all dependencies
node scripts/doctor.mjs

# Generate SFX (only needed once, or when tuning)
node scripts/generate-sfx.mjs

# Generate TTS for an episode
node scripts/generate-tts.mjs episodes/my-episode.json

# Build HyperFrames + Remotion projects
node scripts/build-episode.mjs episodes/my-episode.json

# -- HyperFrames render -------------------------------------------------
cd hyperframes-project
# Set FFmpeg path if not in system PATH:
$env:HYPERFRAMES_FFMPEG_PATH = "$PWD\node_modules\ffmpeg-static\ffmpeg.exe"
npx hyperframes render --quality draft --output renders/my-episode-hf.mp4
# High quality (slower):
npx hyperframes render --quality high --output renders/my-episode-hq.mp4

# -- Remotion render ----------------------------------------------------
cd ../remotion-studio
# If Chrome download is blocked, point to HyperFrames' cached headless shell:
$exe = (Get-Item "$env:USERPROFILE\.cache\hyperframes\chrome\**\chrome-headless-shell.exe" | Select-Object -First 1).FullName
npx remotion render src/index.ts RobloxShort out/my-episode.mp4 --concurrency=2 --browser-executable="$exe"
```

---

## 🎙️ TTS Details

- Uses **Microsoft Edge Neural TTS** (free, no API key) via `msedge-tts` npm package
- Falls back to **Windows SAPI** (`Add-Type -AssemblyName System.Speech`) if offline
- Audio mastered with FFmpeg: `acompressor -> equalizer -> loudnorm (-13.5 LUFS)`
- Voice profile matches viral "In This Town" shorts pacing

---

## 🎵 Audio Pipeline

```
generate-sfx.mjs  ->  shared-assets/audio/  (pop.wav, ding.wav, whoosh.wav, boom.wav, ambient_eerie.wav)
generate-tts.mjs  ->  shared-assets/voiceover/<episode-id>/beat-0.wav ... beat-N.wav
build-episode.mjs ->  copies audio into hyperframes-project/assets/
                  ->  writes hyperframes-project/index.html (HF composition)
                  ->  updates remotion-studio/src/RobloxShort.tsx
```

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| `pcm_f32le Unknown encoder` | Use Gyan FFmpeg; set `HYPERFRAMES_FFMPEG_PATH` to its `.exe` |
| `getaddrinfo ENOTFOUND remotion.media` | Use `--browser-executable` pointing to cached chrome-headless-shell |
| `gsap is not defined` in HF | `build-episode.mjs` injects GSAP script tag automatically |
| TTS hangs / no audio | Edge TTS needs internet. Script auto-falls back to Windows SAPI. |
| HyperFrames uses 1 render worker | Low-memory mode (<=8GB RAM). Add `--no-low-memory-mode` if you have more RAM. |
| `npx not found` | Ensure Node.js `bin/` dir is in PATH; run `node scripts/setup.mjs` |

---

## 📦 npm Scripts (from root)

```powershell
npm run doctor   # Check all dependencies
npm run sfx      # Generate SFX + music bed
npm run tts      # TTS: npm run tts -- episodes/my-ep.json
npm run build    # Build: npm run build -- episodes/my-ep.json
```

---

## 🌟 Stack

- **[HyperFrames](https://hyperframes.dev)** — GPU-accelerated browser-based video renderer
- **[Remotion](https://remotion.dev)** — React-based programmatic video
- **[Three.js](https://threejs.org)** — 3D Roblox scene
- **[GSAP](https://gsap.com)** — Animation engine
- **[msedge-tts](https://npmjs.com/package/msedge-tts)** — Free Edge Neural TTS
- **[ffmpeg-static](https://npmjs.com/package/ffmpeg-static)** — Gyan FFmpeg bundled as npm

---

## 📝 License

MIT — Make viral content freely.
