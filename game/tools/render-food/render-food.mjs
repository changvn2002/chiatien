// render-food.mjs — ĐIỀU PHỐI pipeline món G2 (1 lệnh chạy lại trọn vòng):
//   node game/tools/render-food/render-food.mjs            -> sheet sản xuất
//        + đóng gói public/game/atlas/g2-food.webp / g2-food.json (Phaser hash)
//   node game/tools/render-food/render-food.mjs --inspect  -> ảnh kiểm ứng viên
//        (render-food-inspect.png cạnh file này, KHÔNG đóng gói)
// Nguồn model: Kenney Food Kit 2.0 — CC0 (verify tại https://kenney.nl/assets/food-kit,
// dòng "License | Creative Commons CC0"; License.txt trong zip tải về cũng ghi
// "License: (Creative Commons Zero, CC0)"). Model đã trích sẵn ở models/.
// Đóng gói: PIL (Pillow) hạ sheet 256->128/ô (Lanczos) + WebP method 6,
// quality 86 (hạ từ 88 ở đợt FIX-V3 lane A2 để vừa trần dòng B khi sheet
// lên 8 món; chênh 88->86 trên sprite low-poly mềm ở cỡ hiển thị 84-96px
// sân khấu là dưới ngưỡng nhìn thấy — đối chiếu frame trong handoff A2;
// ghi đè bằng env FOOD_WEBP_QUALITY khi cần).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, '../../..');
const inspectArg = process.argv.find((a) => a === '--inspect' || a.startsWith('--inspect='));
const inspect = Boolean(inspectArg);
const inspectVal = inspectArg && inspectArg.includes('=') ? inspectArg.split('=')[1] : '1';
const tmpPng = path.join(os.tmpdir(), inspect ? 'g2-food-inspect.png' : 'g2-food-sheet.png');
// Scratch PNG để TRONG thư mục tool này (bản trước để ở chiatien-game-v2/
// bị tiến trình khác dọn mất giữa chừng khiến bước đóng gói mất file meta).
const scratchPng = path.join(toolDir, '.work-sheet.png');
const outPng = inspect ? path.join(toolDir, 'render-food-inspect.png') : scratchPng;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(cmd + ' exit ' + code))));
  });
}
function bg(cmd, args) {
  const p = spawn(cmd, args, { stdio: 'inherit' });
  p.on('error', (e) => console.error('bg err', e.message));
  return p;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const serve = bg('node', [path.join(toolDir, 'render-food-serve.mjs')]);
const proxy = bg('node', [path.join(toolDir, 'render-food-proxy.mjs')]);
try {
  await sleep(1200);
  const angleArg = process.argv.find((a) => a.startsWith('--angle='));
  const itemsArg = process.argv.find((a) => a.startsWith('--items='));
  let url = 'http://food.test/render-food.html' + (inspect ? '?inspect=' + inspectVal : '');
  if (angleArg) url += (url.includes('?') ? '&' : '?') + 'angle=' + angleArg.split('=')[1];
  if (itemsArg) url += (url.includes('?') ? '&' : '?') + 'items=' + itemsArg.split('=')[1];
  await run('node', [path.join(toolDir, 'render-food-extract.mjs'), url, outPng]);
  if (!inspect) {
    const py = `
import json, sys
from PIL import Image
src, meta_path, webp_out, json_out = sys.argv[1:5]
meta = json.load(open(meta_path))
img = Image.open(src).convert('RGBA')
cell_src = meta['cell']; cell = 128; cols = meta['cols']; rows = meta['rows']
img = img.resize((cols*cell, rows*cell), Image.LANCZOS)
import os as _os
_q = int(_os.environ.get('FOOD_WEBP_QUALITY', '86'))
_aq = int(_os.environ.get('FOOD_WEBP_ALPHA_QUALITY', '100'))
img.save(webp_out, 'WEBP', quality=_q, method=6, alpha_quality=_aq)
frames = {}
for i, name in enumerate(meta['items']):
    x = (i % cols) * cell; y = (i // cols) * cell
    frames[name] = {
        'frame': {'x': x, 'y': y, 'w': cell, 'h': cell},
        'rotated': False, 'trimmed': False,
        'sourceSize': {'w': cell, 'h': cell},
        'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell},
    }
atlas = {'frames': frames, 'meta': {'app': 'render-food (Kenney Food Kit CC0, Three.js pre-render)', 'version': '1.0', 'image': 'g2-food.webp', 'format': 'RGBA8888', 'size': {'w': cols*cell, 'h': rows*cell}, 'scale': '1'}}
json.dump(atlas, open(json_out, 'w'), ensure_ascii=False, indent=1)
print('webp bytes:', __import__('os').path.getsize(webp_out))
`;
    const atlasDir = path.join(repoRoot, 'public/game/atlas');
    fs.mkdirSync(atlasDir, { recursive: true });
    await run('python3', [
      '-c',
      py,
      outPng,
      outPng + '.meta.json',
      path.join(atlasDir, 'g2-food.webp'),
      path.join(atlasDir, 'g2-food.json'),
    ]);
    fs.rmSync(outPng, { force: true });
    fs.rmSync(outPng + '.meta.json', { force: true });
    void tmpPng;
  }
} finally {
  serve.kill('SIGKILL');
  proxy.kill('SIGKILL');
}
