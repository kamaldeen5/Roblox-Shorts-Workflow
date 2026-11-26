import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(cmd, cwd = process.cwd()) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

run("node scripts/doctor.mjs");
run("node scripts/generate-sfx.mjs");
run("node scripts/build-episode.mjs episodes/every-lie-grows.json");
run("npm run hf:lint");
run("npm run hf:check");
run("npm run hf:snapshot");

const snapDir = path.resolve("hyperframes-project", ".hyperframes", "artifacts", "snapshots");
if (fs.existsSync(snapDir)) {
  const files = fs.readdirSync(snapDir);
  console.log(`\nSnapshots generated (${files.length}):`, files.join(", "));
}

run("npm --prefix remotion-studio run still");
console.log("\n[PASS] Full Remotion + HyperFrames pipeline verified.");
