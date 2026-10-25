// render-preview.mjs — driver lane A4 (FIX-V4): render frame idle 3/4 của mọi
// nhân vật 3 bộ vào scratch-a4/raw-previews/<setId>/<modelKey>.png.
// Bảng nhân vật/biến thể PHẢI khớp render-set.mjs (pipeline atlas) — sửa ở đó
// thì sửa ở đây. Bước ghép sheet WebP do build-previews.py làm riêng.
//
// Dùng (từ thư mục repo app):
//   node game/tools/render-preview.mjs                 → mọi bộ, yaw mặc định
//   ONLY_SET=blocky ONLY_CHARS=blocky-a YAW_DEG=-35 node game/tools/render-preview.mjs
//   OUTROOT=<dir> YAW_DEG=0 node game/tools/render-preview.mjs  (thử góc)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOME = process.env.HOME;
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const CELL = process.env.CELL || '384';
const YAW = process.env.YAW_DEG || '-35';
const OUTROOT = process.env.OUTROOT || `${HOME}/workspace/mini-apps/chiatien-game-v2/scratch-a4/raw-previews`;

const ADV = '/chiatien-game-v2/visual-demos/b-3d-realtime/assets/';
const SKEL = '/chiatien-game-v2/scratch-a3/skel/';
const BLOCKY = '/chiatien-game-v2/scratch-a3/blocky/';

const SETS = [
  {
    setId: 'adventurers', family: 'adv',
    chars: [
      { key: 'knight',        src: ADV + 'Knight.glb' },
      { key: 'barbarian',     src: ADV + 'Barbarian.glb' },
      { key: 'mage',          src: ADV + 'Mage.glb' },
      { key: 'rogue',         src: ADV + 'Rogue.glb' },
      { key: 'roguehooded',   src: '/chiatien-game-v2/scratch-a/assets-extra/Rogue_Hooded.glb' },
      { key: 'knight-red',    src: ADV + 'Knight.glb',    tintBody: 'C62828', hide: 'Knight_Helmet' },
      { key: 'barbarian-ice', src: ADV + 'Barbarian.glb', tintBody: '1565C0', hide: 'Barbarian_Hat' },
      { key: 'mage-purple',   src: ADV + 'Mage.glb',      tintBody: '6A1B9A', hide: 'Mage_Hat' },
      { key: 'rogue-orange',  src: ADV + 'Rogue.glb',     tintBody: 'E65100', hide: 'Rogue_Cape' },
      { key: 'hooded-teal',   src: '/chiatien-game-v2/scratch-a/assets-extra/Rogue_Hooded.glb', tintBody: '00695C', hide: 'Rogue_Cape' },
      { key: 'knight-night',  src: ADV + 'Knight.glb',    tintBody: '263238', hide: 'Knight_Cape' },
      { key: 'mage-leaf',     src: ADV + 'Mage.glb',      tintBody: '2E7D32', hide: 'Mage_Cape' },
    ],
  },
  {
    setId: 'skeletons', family: 'adv',
    chars: [
      { key: 'skel-warrior',       src: SKEL + 'Skeleton_Warrior.glb' },
      { key: 'skel-minion',        src: SKEL + 'Skeleton_Minion.glb' },
      { key: 'skel-rogue',         src: SKEL + 'Skeleton_Rogue.glb' },
      { key: 'skel-mage',          src: SKEL + 'Skeleton_Mage.glb' },
      { key: 'skel-warrior-ghost', src: SKEL + 'Skeleton_Warrior.glb', tintAll: '7FE0B2' },
      { key: 'skel-minion-ember',  src: SKEL + 'Skeleton_Minion.glb',  tintAll: 'FF9A5C' },
      { key: 'skel-rogue-frost',   src: SKEL + 'Skeleton_Rogue.glb',   tintAll: '8FD0FF', hide: 'Skeleton_Rogue_Hood' },
      { key: 'skel-mage-gold',     src: SKEL + 'Skeleton_Mage.glb',    tintAll: 'FFD94D', hide: 'Skeleton_Mage_Hat' },
      { key: 'skel-warrior-ash',   src: SKEL + 'Skeleton_Warrior.glb', tintAll: '9AA3AD', hide: 'Skeleton_Warrior_Helmet' },
      { key: 'skel-minion-rose',   src: SKEL + 'Skeleton_Minion.glb',  tintAll: 'FF9FB0', hide: 'Skeleton_Minion_Cloak' },
      { key: 'skel-rogue-mint',    src: SKEL + 'Skeleton_Rogue.glb',   tintAll: '5CE8C8', hide: 'Skeleton_Rogue_Cape' },
      { key: 'skel-mage-violet',   src: SKEL + 'Skeleton_Mage.glb',    tintAll: 'C79BFF' },
    ],
  },
  {
    setId: 'blocky', family: 'blocky',
    chars: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map(ch => ({
      key: 'blocky-' + ch, src: BLOCKY + 'character-' + ch + '.glb',
    })),
  },
];

const onlySet = process.env.ONLY_SET;
const onlyChars = process.env.ONLY_CHARS ? process.env.ONLY_CHARS.split(',') : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const env = { ...process.env, TMPDIR: HOME + '/wtmp' };
fs.mkdirSync(HOME + '/wtmp', { recursive: true });

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', env });
    p.on('exit', code => code === 0 ? resolve() : reject(new Error(cmd + ' exit ' + code)));
  });
}

const server = spawn('python3', ['-m', 'http.server', '9179', '--bind', '127.0.0.1'], {
  cwd: HOME + '/workspace/mini-apps', env, stdio: 'ignore',
});
const proxy = spawn('node', [path.join(TOOLS, 'demo-proxy.mjs')], {
  env: { ...env, STATIC_PORT: '9179' }, stdio: 'ignore',
});
try {
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    try { const r = await fetch('http://127.0.0.1:9179/chiatien/game/tools/render-preview.html'); up = r.ok; } catch {}
    if (!up) await sleep(250);
  }
  if (!up) throw new Error('server tinh khong len duoc');
  await sleep(400);
  for (const set of SETS) {
    if (onlySet && set.setId !== onlySet) continue;
    const outDir = path.join(OUTROOT, set.setId);
    fs.mkdirSync(outDir, { recursive: true });
    for (const c of set.chars) {
      if (onlyChars && !onlyChars.includes(c.key)) continue;
      const q = new URLSearchParams({ src: c.src, family: set.family, cell: CELL, yawDeg: YAW });
      if (c.hide) q.set('hide', c.hide);
      if (c.tintBody) q.set('tintBody', c.tintBody);
      if (c.tintAll) q.set('tintAll', c.tintAll);
      if (c.tintHead) q.set('tintHead', c.tintHead);
      const url = `http://atlas.test/chiatien/game/tools/render-preview.html?${q}`;
      console.log('== preview', set.setId, c.key, 'yaw', YAW);
      await run('node', [path.join(TOOLS, 'extract-atlas.mjs'), url,
        `${outDir}/${c.key}.png`, `${outDir}/${c.key}.meta.json`]);
    }
  }
  console.log('XONG. PNG tho o', OUTROOT);
} finally {
  server.kill('SIGKILL');
  proxy.kill('SIGKILL');
}
