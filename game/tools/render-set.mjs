// render-set.mjs — driver pipeline A3: render TUẦN TỰ mọi bộ nhân vật trong
// public/game/atlas/sets/ (mỗi nhân vật 1 sheet PNG thô vào scratch-a3/raw-sets).
// Bước nén WebP + JSON + manifest do build-sets.py làm riêng.
//
// Dùng (từ thư mục repo app):
//   node game/tools/render-set.mjs                      → mọi bộ, mọi nhân vật
//   ONLY_SET=adventurers ONLY_CHARS=knight node game/tools/render-set.mjs
//   CELL=128 FRAMES_SPEC=idle:3,run:5,... node game/tools/render-set.mjs
// Hạ tầng như pipeline cũ: server tĩnh gốc ~/workspace/mini-apps cổng 9179 +
// proxy demo-proxy.mjs (hostname ảo atlas.test) + extract-atlas.mjs/Chrome.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOME = process.env.HOME;
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const CELL = process.env.CELL || '128';
const FRAMES_SPEC = process.env.FRAMES_SPEC || 'idle:3,run:4,punchA:5,punchB:4,kick:5,hitA:3,hitB:3,dodge:3,fall:4,victory:3';
const OUTROOT = `${HOME}/workspace/mini-apps/chiatien-game-v2/scratch-a3/raw-sets`;

const ADV = '/chiatien-game-v2/visual-demos/b-3d-realtime/assets/';
const SKEL = '/chiatien-game-v2/scratch-a3/skel/';
const BLOCKY = '/chiatien-game-v2/scratch-a3/blocky/';

// Bảng nhân vật + biến thể NƯỚNG (ẩn phụ kiện + tint trang phục/thân).
// tintBody chỉ tác động mesh Body/Arm/Leg (xem render-set.html) — đầu giữ nguyên.
const SETS = [
  {
    setId: 'adventurers', family: 'adv',
    chars: [
      { key: 'knight',        name: 'Hiệp Sĩ',              src: ADV + 'Knight.glb',    base: 'Knight' },
      { key: 'barbarian',     name: 'Chiến Binh',            src: ADV + 'Barbarian.glb', base: 'Barbarian' },
      { key: 'mage',          name: 'Pháp Sư',               src: ADV + 'Mage.glb',      base: 'Mage' },
      { key: 'rogue',         name: 'Thích Khách',           src: ADV + 'Rogue.glb',     base: 'Rogue' },
      { key: 'roguehooded',   name: 'Thích Khách Trùm Đầu',  src: '/chiatien-game-v2/scratch-a/assets-extra/Rogue_Hooded.glb', base: 'Rogue_Hooded' },
      { key: 'knight-red',    name: 'Hiệp Sĩ Đỏ',           src: ADV + 'Knight.glb',    base: 'Knight',       tintBody: 'C62828', hide: 'Knight_Helmet' },
      { key: 'barbarian-ice', name: 'Chiến Binh Băng',       src: ADV + 'Barbarian.glb', base: 'Barbarian',    tintBody: '1565C0', hide: 'Barbarian_Hat' },
      { key: 'mage-purple',   name: 'Pháp Sư Tím',           src: ADV + 'Mage.glb',      base: 'Mage',         tintBody: '6A1B9A', hide: 'Mage_Hat' },
      { key: 'rogue-orange',  name: 'Thích Khách Cam',       src: ADV + 'Rogue.glb',     base: 'Rogue',        tintBody: 'E65100', hide: 'Rogue_Cape' },
      { key: 'hooded-teal',   name: 'Trùm Đầu Ngọc',         src: '/chiatien-game-v2/scratch-a/assets-extra/Rogue_Hooded.glb', base: 'Rogue_Hooded', tintBody: '00695C', hide: 'Rogue_Cape' },
      { key: 'knight-night',  name: 'Hiệp Sĩ Đêm',           src: ADV + 'Knight.glb',    base: 'Knight',       tintBody: '263238', hide: 'Knight_Cape' },
      { key: 'mage-leaf',     name: 'Pháp Sư Lá',            src: ADV + 'Mage.glb',      base: 'Mage',         tintBody: '2E7D32', hide: 'Mage_Cape' },
    ],
  },
  {
    setId: 'skeletons', family: 'adv',
    chars: [
      { key: 'skel-warrior',       name: 'Xương Chiến Binh',  src: SKEL + 'Skeleton_Warrior.glb', base: 'Skeleton_Warrior' },
      { key: 'skel-minion',        name: 'Xương Lính',        src: SKEL + 'Skeleton_Minion.glb',  base: 'Skeleton_Minion' },
      { key: 'skel-rogue',         name: 'Xương Thích Khách',src: SKEL + 'Skeleton_Rogue.glb',   base: 'Skeleton_Rogue' },
      { key: 'skel-mage',          name: 'Xương Pháp Sư',     src: SKEL + 'Skeleton_Mage.glb',    base: 'Skeleton_Mage' },
      { key: 'skel-warrior-ghost', name: 'Xương Chiến Ma',    src: SKEL + 'Skeleton_Warrior.glb', base: 'Skeleton_Warrior', tintAll: '7FE0B2' },
      { key: 'skel-minion-ember',  name: 'Xương Lính Lửa',    src: SKEL + 'Skeleton_Minion.glb',  base: 'Skeleton_Minion',  tintAll: 'FF9A5C' },
      { key: 'skel-rogue-frost',   name: 'Xương Khách Băng',  src: SKEL + 'Skeleton_Rogue.glb',   base: 'Skeleton_Rogue',   tintAll: '8FD0FF', hide: 'Skeleton_Rogue_Hood' },
      { key: 'skel-mage-gold',     name: 'Xương Sư Vàng',     src: SKEL + 'Skeleton_Mage.glb',    base: 'Skeleton_Mage',    tintAll: 'FFD94D', hide: 'Skeleton_Mage_Hat' },
      { key: 'skel-warrior-ash',   name: 'Xương Chiến Tro',   src: SKEL + 'Skeleton_Warrior.glb', base: 'Skeleton_Warrior', tintAll: '9AA3AD', hide: 'Skeleton_Warrior_Helmet' },
      { key: 'skel-minion-rose',   name: 'Xương Lính Hồng',   src: SKEL + 'Skeleton_Minion.glb',  base: 'Skeleton_Minion',  tintAll: 'FF9FB0', hide: 'Skeleton_Minion_Cloak' },
      { key: 'skel-rogue-mint',    name: 'Xương Khách Ngọc',  src: SKEL + 'Skeleton_Rogue.glb',   base: 'Skeleton_Rogue',   tintAll: '5CE8C8', hide: 'Skeleton_Rogue_Cape' },
      { key: 'skel-mage-violet',   name: 'Xương Sư Tím',      src: SKEL + 'Skeleton_Mage.glb',    base: 'Skeleton_Mage',    tintAll: 'C79BFF' },
    ],
  },
  {
    setId: 'blocky', family: 'blocky',
    chars: [
      ['a', 'Khối Cam'], ['b', 'Khối Đỏ'], ['c', 'Khối Xanh Lá'], ['d', 'Khối Vàng'],
      ['e', 'Khối Tím'], ['f', 'Khối Rêu'], ['g', 'Khối Robot'], ['h', 'Khối Quái Tím'],
      ['i', 'Khối Trắng'], ['j', 'Khối Đêm'], ['k', 'Khối Nâu Đỏ'], ['l', 'Khối Zombie'],
    ].map(([ch, name]) => ({
      key: 'blocky-' + ch, name,
      src: BLOCKY + 'character-' + ch + '.glb', base: 'character-' + ch,
    })),
  },
];

// YAW_DEG (tuỳ chọn, lane A5 FIX-V4.1): góc yaw TUYỆT ĐỐI truyền xuống
// render-set.html (?yawDeg=). Không đặt → pipeline giữ profile cũ π/2.
// Bộ blocky chạy lại với YAW_DEG=-35 (góc preview đã chứng minh của A4).
const YAW_DEG = process.env.YAW_DEG;
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
    try { const r = await fetch('http://127.0.0.1:9179/chiatien/game/tools/render-set.html'); up = r.ok; } catch {}
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
      const q = new URLSearchParams({ src: c.src, family: set.family, cell: CELL, framesSpec: FRAMES_SPEC });
      if (YAW_DEG) q.set('yawDeg', YAW_DEG);
      if (c.hide) q.set('hide', c.hide);
      if (c.tintBody) q.set('tintBody', c.tintBody);
      if (c.tintAll) q.set('tintAll', c.tintAll);
      if (c.tintHead) q.set('tintHead', c.tintHead);
      const url = `http://atlas.test/chiatien/game/tools/render-set.html?${q}`;
      console.log('== render', set.setId, c.key);
      await run('node', [path.join(TOOLS, 'extract-atlas.mjs'), url,
        `${outDir}/${c.key}.png`, `${outDir}/${c.key}.meta.json`]);
      // ghi cấu hình nhân vật cạnh meta để build-sets.py dựng manifest
      const meta = JSON.parse(fs.readFileSync(`${outDir}/${c.key}.meta.json`, 'utf8'));
      meta.charKey = c.key; meta.displayName = c.name; meta.baseModel = c.base;
      meta.variantOf = (c.tintBody || c.tintAll || c.hide) ? c.base : null;
      fs.writeFileSync(`${outDir}/${c.key}.meta.json`, JSON.stringify(meta, null, 2));
    }
  }
  console.log('XONG. PNG tho o', OUTROOT);
} finally {
  server.kill('SIGKILL');
  proxy.kill('SIGKILL');
}
