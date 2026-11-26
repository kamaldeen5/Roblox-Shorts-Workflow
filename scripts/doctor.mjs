import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function checkCmd(name, cmd) {
  try {
    const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
      .trim()
      .split(/\r?\n/)[0];
    console.log(`[OK] ${name}: ${out}`);
    return true;
  } catch {
    console.log(`[MISSING] ${name}`);
    return false;
  }
}

console.log("=== Roblox Shorts Studio Doctor ===");
const okNode = checkCmd("Node.js", "node -v");
const okNpm = checkCmd("npm", "npm -v");
const okFfmpeg = checkCmd("FFmpeg", "ffmpeg -version");
const okFfprobe = checkCmd("FFprobe", "ffprobe -version");

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const foundChrome = chromePaths.find((p) => fs.existsSync(p));
console.log(foundChrome ? `[OK] Chrome: ${foundChrome}` : "[WARN] Chrome not found in Program Files");

const hfPkg = path.resolve("hyperframes-project", "node_modules", "hyperframes", "package.json");
const remPkg = path.resolve("remotion-studio", "node_modules", "remotion", "package.json");
console.log(fs.existsSync(hfPkg) ? "[OK] HyperFrames installed" : "[MISSING] HyperFrames (run npm install in hyperframes-project)");
console.log(fs.existsSync(remPkg) ? "[OK] Remotion installed" : "[MISSING] Remotion (run npm install in remotion-studio)");

if (!okNode || !okNpm || !okFfmpeg || !okFfprobe) {
  process.exitCode = 1;
}
