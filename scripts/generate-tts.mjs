/**
 * Generates high-energy, high-pitched, fast-paced viral Shorts voiceover WAVs
 * using Microsoft Edge Neural TTS (msedge-tts) + FFmpeg vocal mastering chain
 * (silence trim, presence EQ, tight compression, -13.5 LUFS loudness).
 * Falls back to Windows SAPI + FFmpeg pitch/tempo if offline.
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const episodeArg = process.argv[2] || "episodes/sample-10s.json";
const episodePath = path.isAbsolute(episodeArg) ? episodeArg : path.resolve(ROOT, episodeArg);
const episode = JSON.parse(fs.readFileSync(episodePath, "utf8"));

const outDir = path.join(ROOT, "shared-assets", "voiceover", episode.slug);
fs.mkdirSync(outDir, { recursive: true });

// Viral "In This Town" voice profile: energetic youthful neural voice, +14% pitch, +20% speed
const voiceName = episode.voice?.name || "en-US-BrianNeural";
const pitchOffset = episode.voice?.pitch || "+16Hz";
const rateOffset = episode.voice?.rate || "+22%";

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
  } catch {}
  return 2.0;
}

function masterVoiceWav(rawPath, finalPath, extraTempo = 1.0) {
  // Viral Shorts vocal chain:
  // 1. Trim dead silence at start/end for zero-gap pacing
  // 2. High-pass 95Hz + presence boost (+3.5dB @ 3.5kHz, +2.5dB @ 7.5kHz)
  // 3. Tight broadcast compression + loudnorm to -13.5 LUFS (matches -14.4 LUFS viral ref)
  const tempoFilter = extraTempo !== 1.0 ? `atempo=${extraTempo.toFixed(3)},` : "";
  const af = [
    "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-42dB",
    "areverse,silenceremove=start_periods=1:start_silence=0.03:start_threshold=-42dB,areverse",
    `${tempoFilter}highpass=f=95`,
    "equalizer=f=3500:t=q:w=1.4:g=3.5",
    "equalizer=f=7500:t=q:w=1.6:g=2.5",
    "acompressor=threshold=-18dB:ratio=4.5:attack=4:release=55:makeup=4",
    "loudnorm=I=-13.5:TP=-1.5:LRA=2.5",
  ].join(",");

  execFileSync(
    "ffmpeg.exe",
    ["-y", "-v", "error", "-i", rawPath, "-af", af, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", finalPath],
    { stdio: "inherit" }
  );
}

async function generateWithEdgeTts() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  for (let i = 0; i < episode.beats.length; i++) {
    const b = episode.beats[i];
    const rawMp3 = path.join(outDir, `raw-${i}.mp3`);
    const finalWav = path.join(outDir, `beat-${i}.wav`);

    const { audioStream } = tts.toStream(b.narration, {
      pitch: pitchOffset,
      rate: rateOffset,
    });

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(rawMp3);
      audioStream.pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
      audioStream.on("error", reject);
    });

    masterVoiceWav(rawMp3, finalWav);
    if (fs.existsSync(rawMp3)) fs.unlinkSync(rawMp3);
  }
}

function generateWithSapiFallback() {
  console.warn("Edge TTS unavailable, falling back to Windows SAPI + FFmpeg pitch/speed...");
  const scriptLines = [
    "Add-Type -AssemblyName System.Speech",
    "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }",
    "$preferred = $voices | Where-Object { $_ -match 'David|Mark|Guy|Zira' } | Select-Object -First 1",
    "if ($preferred) { $synth.SelectVoice($preferred) }",
    "$synth.Rate = 4",
    "$synth.Volume = 100",
  ];
  for (let i = 0; i < episode.beats.length; i++) {
    const b = episode.beats[i];
    const rawWav = path.join(outDir, `raw-${i}.wav`).replaceAll("'", "''");
    const text = b.narration.replaceAll("'", "''");
    scriptLines.push(`$synth.SetOutputToWaveFile('${rawWav}')`);
    scriptLines.push(`$synth.Speak('${text}')`);
  }
  scriptLines.push("$synth.SetOutputToDefaultAudioDevice()");
  scriptLines.push("$synth.Dispose()");

  const psFile = path.join(outDir, "_tts.ps1");
  fs.writeFileSync(psFile, scriptLines.join("\n"), "utf8");
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { stdio: "inherit" });
  fs.unlinkSync(psFile);

  for (let i = 0; i < episode.beats.length; i++) {
    const rawWav = path.join(outDir, `raw-${i}.wav`);
    const finalWav = path.join(outDir, `beat-${i}.wav`);
    // Pitch up +15% via asetrate + atempo compensation
    const pitchRaw = path.join(outDir, `pitch-${i}.wav`);
    execFileSync(
      "ffmpeg.exe",
      ["-y", "-v", "error", "-i", rawWav, "-af", "asetrate=44100*1.15,aresample=44100", pitchRaw],
      { stdio: "inherit" }
    );
    masterVoiceWav(pitchRaw, finalWav, 1.05);
    if (fs.existsSync(rawWav)) fs.unlinkSync(rawWav);
    if (fs.existsSync(pitchRaw)) fs.unlinkSync(pitchRaw);
  }
}

try {
  await generateWithEdgeTts();
  console.log(`Using Edge Neural TTS (${voiceName}, pitch=${pitchOffset}, rate=${rateOffset})`);
} catch (err) {
  console.warn("Edge TTS error:", err?.message || err);
  generateWithSapiFallback();
}

const summary = episode.beats.map((b, i) => {
  const f = path.join(outDir, `beat-${i}.wav`);
  return { beat: b.id, file: `beat-${i}.wav`, duration: readWavDuration(f) };
});

console.log("Generated mastered voiceover WAVs:", JSON.stringify(summary));
