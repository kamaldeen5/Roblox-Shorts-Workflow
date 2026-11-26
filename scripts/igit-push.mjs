#!/usr/bin/env node
/**
 * igit-push.mjs — Push repo to GitHub using isomorphic-git (pure Node.js, no git binary)
 * Usage: node scripts/igit-push.mjs <GITHUB_TOKEN>
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import * as nodefs from 'fs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load from project node_modules
const git  = require(join(ROOT, 'node_modules/isomorphic-git'));
const http = require(join(ROOT, 'node_modules/isomorphic-git/http/node'));

const TOKEN  = process.argv[2];
const REMOTE = 'https://github.com/kamaldeen5/Roblox-Shorts-Workflow.git';
const AUTHOR = { name: 'Roblox Shorts Studio', email: 'kamaldeen5@users.noreply.github.com' };

if (!TOKEN) {
  console.error('Usage: node scripts/igit-push.mjs <GITHUB_TOKEN>');
  process.exit(1);
}

const onAuth = () => ({ username: TOKEN, password: 'x-oauth-basic' });

async function main() {
  console.log('🎮 Roblox Shorts Studio — Pushing to GitHub\n');

  // 1. Init
  console.log('1/5  Initializing git repo...');
  await git.init({ fs: nodefs, dir: ROOT, defaultBranch: 'main' });
  await git.setConfig({ fs: nodefs, dir: ROOT, path: 'user.name',  value: AUTHOR.name });
  await git.setConfig({ fs: nodefs, dir: ROOT, path: 'user.email', value: AUTHOR.email });

  // 2. Stage all (isomorphic-git respects .gitignore automatically)
  console.log('2/5  Staging files...');
  const matrix = await git.statusMatrix({ fs: nodefs, dir: ROOT });
  let staged = 0;
  for (const [filepath, _head, workdir] of matrix) {
    if (workdir === 1 || workdir === 2) {
      await git.add({ fs: nodefs, dir: ROOT, filepath });
      staged++;
      if (staged % 20 === 0) process.stdout.write(`     ${staged} files staged...\r`);
    }
  }
  console.log(`\n     ✅ ${staged} files staged`);

  // 3. Commit
  console.log('3/5  Committing...');
  const sha = await git.commit({
    fs: nodefs,
    dir: ROOT,
    message: [
      'feat: Roblox Shorts Studio - full dual-render pipeline (HyperFrames + Remotion)',
      '',
      '- HyperFrames GPU render: 1080x1920 30fps, -13.9 LUFS',
      '- Remotion React render pipeline',
      '- Edge Neural TTS: en-US-BrianNeural +16Hz pitch +22% rate',
      '- 128 BPM viral synth bed + SFX (pop/ding/whoosh/boom)',
      '- FFmpeg vocal mastering chain (-13.5 LUFS)',
      '- Episode: "In This Town, Never Look At The Moon"',
    ].join('\n'),
    author: AUTHOR,
  });
  console.log(`     ✅ Commit: ${sha.slice(0,8)}`);

  // 4. Set remote
  console.log('4/5  Configuring remote...');
  const remotes = await git.listRemotes({ fs: nodefs, dir: ROOT });
  if (!remotes.find(r => r.remote === 'origin')) {
    await git.addRemote({ fs: nodefs, dir: ROOT, remote: 'origin', url: REMOTE });
  } else {
    await git.setConfig({ fs: nodefs, dir: ROOT, path: 'remote.origin.url', value: REMOTE });
  }
  console.log(`     ✅ Remote: ${REMOTE}`);

  // 5. Push
  console.log('5/5  Pushing to GitHub...');
  const result = await git.push({
    fs: nodefs,
    http,
    dir: ROOT,
    remote: 'origin',
    ref: 'main',
    force: true,
    onAuth,
    onProgress: ({ phase, loaded, total }) => {
      if (phase) process.stdout.write(`     ${phase} ${loaded || 0}/${total || '?'}       \r`);
    },
    onMessage: msg => { if (msg.trim()) console.log('    ', msg.trim()); },
  });
  console.log('\n');

  if (result.ok) {
    console.log('✅ Push successful!');
    console.log('🔗 https://github.com/kamaldeen5/Roblox-Shorts-Workflow');
    console.log('\nAnyone can now clone and run:');
    console.log('  git clone https://github.com/kamaldeen5/Roblox-Shorts-Workflow.git');
    console.log('  cd Roblox-Shorts-Workflow && node scripts/setup.mjs');
  } else {
    console.error('❌ Push failed:', JSON.stringify(result));
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message);
  if (e.data) console.error('   Data:', JSON.stringify(e.data));
  process.exit(1);
});
