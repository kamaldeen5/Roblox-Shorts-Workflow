/**
 * Procedural WAV audio generator for Roblox "In This Town" Shorts.
 * Tuned to match viral Shorts sound design:
 *  - Crisp transient SFX (pop, ding, whoosh, punchy sub-boom)
 *  - Driving, rhythmic 128 BPM mysterious synth-pluck bed (ambient_eerie.wav)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "shared-assets", "audio");
const SAMPLE_RATE = 44100;

function writeWav(filename, samples) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

function genPop(duration = 0.18) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 28);
    const freq = 340 + 920 * Math.exp(-t * 38);
    out[i] = Math.tanh(Math.sin(2 * Math.PI * freq * t) * 1.4) * env * 0.9;
  }
  return out;
}

function genDing(duration = 0.65) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 7.5);
    const tone =
      0.55 * Math.sin(2 * Math.PI * 1046.5 * t) +
      0.3 * Math.sin(2 * Math.PI * 1567.98 * t) +
      0.18 * Math.sin(2 * Math.PI * 2093.0 * t);
    out[i] = tone * env * 0.8;
  }
  return out;
}

function genWhoosh(duration = 0.36) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  let seed = 1337;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const white = (seed / 0xffffffff) * 2 - 1;
    const u = i / n;
    const env = Math.sin(Math.PI * u) ** 1.4;
    const alpha = 0.08 + 0.38 * Math.sin(Math.PI * u);
    lp = lp + alpha * (white - lp);
    out[i] = Math.tanh(lp * 1.6) * env * 0.92;
  }
  return out;
}

function genBoom(duration = 0.95) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  let seed = 42;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 4.2);
    const freq = 140 * Math.exp(-t * 6.0) + 38;
    const sub = Math.sin(2 * Math.PI * freq * t);
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const click = ((seed / 0xffffffff) * 2 - 1) * Math.exp(-t * 65) * 0.45;
    out[i] = Math.tanh((sub * 2.4 + click) * env) * 0.95;
  }
  return out;
}

function genAmbientEerie(duration = 26.0) {
  const n = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(n);
  // 128 BPM mysterious minor arpeggio + tight sub pulse + subtle hi-hat tick
  const stepSec = 60 / 128 / 2; // 16th/8th feel (~0.234s per pluck)
  const chords = [
    [220.0, 261.63, 329.63, 392.0], // Am7
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [146.83, 174.61, 220.0, 261.63], // Dm7
    [164.81, 196.0, 246.94, 329.63], // Em7
  ];
  let seed = 9001;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const bar = Math.floor(t / 2.0) % chords.length;
    const step = Math.floor(t / stepSec);
    const stepT = t % stepSec;
    const note = chords[bar][step % 4];

    // Pluck synth (bright attack, fast decay)
    const pluckEnv = Math.exp(-stepT * 11.0);
    const pluck =
      (0.6 * Math.sin(2 * Math.PI * note * stepT) +
        0.25 * Math.sin(2 * Math.PI * note * 2 * stepT) +
        0.15 * Math.sin(2 * Math.PI * note * 3 * stepT)) *
      pluckEnv;

    // Warm sub-bass pulse on quarter notes
    const beatT = t % (stepSec * 2);
    const subFreq = chords[bar][0] * 0.5;
    const sub = Math.sin(2 * Math.PI * subFreq * t) * Math.exp(-beatT * 4.0) * 0.45;

    // Crisp subtle off-beat tick
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const hatNoise = (seed / 0xffffffff) * 2 - 1;
    const hat = step % 2 === 1 ? hatNoise * Math.exp(-stepT * 55) * 0.12 : 0;

    const masterFade = Math.min(1, t / 0.2) * Math.min(1, (duration - t) / 0.5);
    out[i] = Math.tanh((pluck * 0.55 + sub + hat) * 1.15) * masterFade;
  }
  return out;
}

const files = [
  writeWav("pop.wav", genPop()),
  writeWav("ding.wav", genDing()),
  writeWav("whoosh.wav", genWhoosh()),
  writeWav("boom.wav", genBoom()),
  writeWav("ambient_eerie.wav", genAmbientEerie()),
];

console.log("Generated viral-tuned SFX & music:", files.map((f) => path.basename(f)).join(", "));
