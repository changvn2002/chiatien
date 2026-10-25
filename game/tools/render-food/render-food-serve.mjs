// render-food-serve.mjs — server tĩnh tối thiểu cho pipeline render món G2.
// Phục vụ: / -> render-food.html · /models/*.glb (model Kenney CC0 đã trích)
// · /three/* -> bản three@0.180.0 của demo C (đường dẫn ghi dưới, ghi đè
// bằng env FOOD_THREE_DIR khi lane khác vendor bản three riêng).
// Cổng 9178 (demo C dùng 9177 — tránh đụng khi chạy song song).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const THREE_DIR =
  process.env.FOOD_THREE_DIR ||
  path.resolve(toolDir, '../../../../chiatien-game-v2/visual-demos/c-3d-prerender/node_modules/three');
const PORT = Number(process.env.FOOD_SERVE_PORT || 9178);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json', '.wasm': 'application/wasm' };
function send(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found ' + file); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  if (p === '/' || p === '/render-food.html') return send(res, path.join(toolDir, 'render-food.html'));
  // GLB tham chiếu texture ngoài ở models/Textures/colormap.png -> giữ nguyên
  // đường con dưới /models/ (chặn '..' để không thoát khỏi thư mục models).
  if (p.startsWith('/models/')) {
    const rel = p.slice('/models/'.length);
    if (rel.includes('..')) { res.writeHead(403); res.end('forbidden'); return; }
    return send(res, path.join(toolDir, 'models', rel));
  }
  if (p.startsWith('/three/')) return send(res, path.join(THREE_DIR, p.slice('/three/'.length)));
  res.writeHead(404); res.end('not found');
}).listen(PORT, '127.0.0.1', () => console.log(`render-food serve on ${PORT}, three=${THREE_DIR}`));
