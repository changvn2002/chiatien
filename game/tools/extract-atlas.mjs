// extract-atlas.mjs — trích sprite sheet PNG (alpha thật) từ canvas của
// render-atlas.html qua CDP: chờ title SHEET_DONE rồi kéo canvas.toDataURL
// theo từng khúc (screenshot CDP nướng nền trắng — bẫy demo C #5).
// Dùng: node extract-atlas.mjs <url> <out.png> <out.meta.json>
// Yêu cầu: demo-proxy.mjs đang chạy (Chrome 152 chặn localhost — bẫy demo C #1)
// và TMPDIR trỏ vào ~/workspace (không dùng /tmp — bẫy demo C #2).
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const [, , url, out, metaOut] = process.argv;
if (!url || !out) {
  console.error('thieu tham so: <url> <out.png> [out.meta.json]');
  process.exit(2);
}
const PORT = 19700 + Math.floor(Math.random() * 200);
const HOME = process.env.HOME;
fs.mkdirSync(HOME + '/wtmp', { recursive: true });
const chrome = spawn(
  '/opt/meta-chromium/chrome',
  [
    '--headless=new',
    '--no-sandbox',
    '--no-first-run',
    '--hide-scrollbars',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--proxy-server=http://127.0.0.1:18097',
    '--user-data-dir=' + HOME + '/wtmp/prof' + PORT,
    '--remote-debugging-port=' + PORT,
    '--window-size=800,600',
    'about:blank',
  ],
  { env: { ...process.env, TMPDIR: HOME + '/wtmp' }, stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws,
  msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const evalStr = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval loi');
  return r.result.value;
};

try {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/json/version`);
      if (r.ok) break;
    } catch {}
    await sleep(250);
  }
  const target = await (
    await fetch(`http://localhost:${PORT}/json/new?about:blank`, { method: 'PUT' })
  ).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) {
        p.reject(new Error(JSON.stringify(m.error)));
      } else {
        p.resolve(m.result);
      }
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url });
  let title = '';
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    title = await evalStr('document.title');
    if (title.startsWith('SHEET_DONE')) break;
    await sleep(300);
  }
  if (!title.startsWith('SHEET_DONE')) throw new Error('timeout, title=' + title);
  console.log('title =', title);
  if (metaOut) {
    const meta = await evalStr('JSON.stringify(window.__meta)');
    fs.writeFileSync(metaOut, JSON.stringify(JSON.parse(meta), null, 2));
    console.log('da ghi meta', metaOut);
  }
  const total = await evalStr(
    'window.__url = document.querySelector("canvas").toDataURL("image/png"); window.__url.length',
  );
  let b64 = '';
  const CH = 800000;
  for (let off = 22; off < total; off += CH) {
    b64 += await evalStr(`window.__url.substr(${off}, ${CH})`);
  }
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('da ghi', out, fs.statSync(out).size, 'bytes');
} finally {
  try {
    if (ws) {
      ws.close();
    }
  } catch {}
  chrome.kill('SIGKILL');
}
