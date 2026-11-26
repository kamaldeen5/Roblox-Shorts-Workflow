#!/usr/bin/env node
/**
 * setup.mjs — One-shot installer for Roblox Shorts Studio
 * Run: node scripts/setup.mjs
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', shell: true });
  } catch (e) {
    console.error(`Failed: ${cmd}`);
    process.exit(1);
  }
}

function header(msg) {
  console.log(`\n${'─'.repeat(60)}\n  ${msg}\n${'─'.repeat(60)}`);
}

console.log('🎮 Roblox Shorts Studio — Setup');
console.log('='.repeat(60));

// 1. Root deps (msedge-tts, etc.)
header('1/3  Installing root dependencies…');
run('npm install', root);

// 2. HyperFrames project deps
header('2/3  Installing hyperframes-project dependencies…');
const hfDir = join(root, 'hyperframes-project');
run('npm install', hfDir);

// 3. Remotion project deps
header('3/3  Installing remotion-studio dependencies…');
const remotionDir = join(root, 'remotion-studio');
run('npm install', remotionDir);

// 4. Check ffmpeg-static was pulled in and show ffmpeg path
const ffmpegStatic = join(hfDir, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
if (existsSync(ffmpegStatic)) {
  console.log(`\n✅ ffmpeg-static found: ${ffmpegStatic}`);
  console.log('   Set HYPERFRAMES_FFMPEG_PATH to this path before rendering:');
  console.log(`   $env:HYPERFRAMES_FFMPEG_PATH = "${ffmpegStatic}"`);
} else {
  console.log('\n⚠️  ffmpeg-static not found. Run: cd hyperframes-project && npm install ffmpeg-static');
  console.log('   Or install FFmpeg manually from gyan.dev and set HYPERFRAMES_FFMPEG_PATH.');
}

// 5. Check for Chrome headless shell
const cacheBase = join(process.env.USERPROFILE || process.env.HOME || '', '.cache', 'hyperframes', 'chrome');
if (existsSync(cacheBase)) {
  console.log(`\n✅ Chrome headless shell cache found: ${cacheBase}`);
  console.log('   For Remotion, use: --browser-executable="<path to chrome-headless-shell.exe>"');
} else {
  console.log('\nℹ️  Chrome not cached yet. Run a HyperFrames render once to auto-download it.');
  console.log('   Or use an existing Chrome/Chromium path with --browser-executable.');
}

console.log('\n' + '='.repeat(60));
console.log('✅ Setup complete! Next steps:');
console.log('   node scripts/generate-sfx.mjs');
console.log('   node scripts/generate-tts.mjs episodes/sample-10s.json');
console.log('   node scripts/build-episode.mjs episodes/sample-10s.json');
console.log('   cd hyperframes-project && npx hyperframes render --quality draft --output renders/sample-10s-hf.mp4');
console.log('='.repeat(60) + '\n');
