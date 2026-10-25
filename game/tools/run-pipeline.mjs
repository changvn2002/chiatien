// run-pipeline.mjs — chạy trọn pipeline render atlas G1 (hướng C):
//   server tĩnh (gốc ~/workspace/mini-apps, cổng 9178) + forward proxy
//   (127.0.0.1:18097, hostname ảo atlas.test) + extract-atlas.mjs cho từng model.
// PNG + meta thô ghi vào thư mục scratch của đợt (mặc định
// ~/workspace/mini-apps/chiatien-game-v2/scratch-a/raw-<cell>-<frames>/);
// bước nén sang WebP + JSON Phaser do convert-atlas.py làm riêng để đo cổng nén.
//
// Dùng (từ thư mục repo app):
//   CELL=224 FRAMES=5 node game/tools/run-pipeline.mjs
//   CELL=256 FRAMES=6 MODELS=Knight node game/tools/run-pipeline.mjs   (đo nén)
//   ... thêm MODE=tint để render sheet test tint (chỉ Knight).
// Yêu cầu: node 24, Chrome /opt/meta-chromium/chrome, python3 (server tĩnh),
// three 0.180 ở visual-demos/c-3d-prerender/node_modules (importmap của
// render-atlas.html trỏ thẳng vào đó — KHÔNG cài thêm gì vào app).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOME = process.env.HOME;
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const CELL = process.env.CELL || '224';
const FRAMES = process.env.FRAMES || '5';
const MODE = process.env.MODE || 'atlas';
const ALL = [
  { model: 'Knight' },
  { model: 'Barbarian' },
  { model: 'Mage' },
  { model: 'Rogue' },
  { model: 'RogueHooded', src: '/chiatien-game-v2/scratch-a/assets-extra/Rogue_Hooded.glb' },
];
const models = process.env.MODELS
  ? ALL.filter((m) => process.env.MODELS.split(',').includes(m.model))
  : ALL;
const OUT =
  process.env.OUT ||
  `${HOME}/workspace/mini-apps/chiatien-game-v2/scratch-a/raw-${CELL}-${FRAMES}${MODE === 'tint' ? '-tint' : ''}`;
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(HOME + '/wtmp', { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const env = { ...process.env, TMPDIR: HOME + '/wtmp' };

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', env, ...opts });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(cmd + ' exit ' + code))));
  });
}

const server = spawn('python3', ['-m', 'http.server', '9178', '--bind', '127.0.0.1'], {
  cwd: HOME + '/workspace/mini-apps',
  env,
  stdio: 'ignore',
});
const proxy = spawn('node', [path.join(TOOLS, 'demo-proxy.mjs')], {
  env: { ...env, STATIC_PORT: '9178' },
  stdio: 'ignore',
});
try {
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    try {
      const r = await fetch('http://127.0.0.1:9178/chiatien/game/tools/render-atlas.html');
      up = r.ok;
    } catch {}
    if (!up) await sleep(250);
  }
  if (!up) throw new Error('server tinh khong len duoc');
  await sleep(400); // proxy lắng nghe
  for (const m of models) {
    const q = new URLSearchParams({ model: m.model, cell: CELL, frames: FRAMES, mode: MODE });
    if (m.src) q.set('src', m.src);
    const url = `http://atlas.test/chiatien/game/tools/render-atlas.html?${q}`;
    console.log('== render', m.model, 'cell', CELL, 'frames', FRAMES, MODE);
    await run('node', [
      path.join(TOOLS, 'extract-atlas.mjs'),
      url,
      `${OUT}/${m.model}.png`,
      `${OUT}/${m.model}.meta.json`,
    ]);
  }
  console.log('XONG. PNG tho o', OUT);
} finally {
  server.kill('SIGKILL');
  proxy.kill('SIGKILL');
}
