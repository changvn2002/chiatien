// render-food-extract.mjs — trích sheet PNG (alpha thật) từ canvas của trang
// render qua CDP: chờ title FOOD_DONE rồi kéo canvas.toDataURL theo khúc.
// Dùng: node render-food-extract.mjs <url> <out.png>
// (Screenshot CDP nướng nền trắng nên PHẢI trích qua toDataURL — bài học demo C.)
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const [, , url, out] = process.argv;
const PORT = 19800 + Math.floor(Math.random() * 200);
const HOME = process.env.HOME;
const chrome = spawn(
  '/opt/meta-chromium/chrome',
  [
    '--headless=new',
    '--no-sandbox',
    '--no-first-run',
    '--hide-scrollbars',
    '--proxy-server=http://127.0.0.1:18098',
    '--user-data-dir=' + HOME + '/wtmp/foodprof' + PORT,
    '--remote-debugging-port=' + PORT,
    '--window-size=900,700',
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
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval lỗi');
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
      if (m.error) p.reject(new Error(JSON.stringify(m.error)));
      else p.resolve(m.result);
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url });
  let title = '';
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    title = await evalStr('document.title');
    if (title.startsWith('FOOD_DONE')) break;
    await sleep(300);
  }
  if (!title.startsWith('FOOD_DONE')) throw new Error('timeout, title=' + title);
  console.log('title =', title);
  fs.writeFileSync(out + '.meta.json', title.slice('FOOD_DONE '.length));
  await evalStr(
    'window.__url = document.querySelector("canvas").toDataURL("image/png"); window.__url.length',
  );
  const total = await evalStr('window.__url.length');
  let b64 = '';
  const CH = 800000;
  for (let off = 22; off < total; off += CH) {
    b64 += await evalStr(`window.__url.substr(${off}, ${CH})`);
  }
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('da ghi', out, fs.statSync(out).size, 'bytes');
} finally {
  try {
    if (ws) ws.close();
  } catch {}
  chrome.kill('SIGKILL');
}
