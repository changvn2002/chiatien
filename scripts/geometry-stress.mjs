// Harness đo HÌNH HỌC THẬT + Esc-focus cho chiatien — deliverable của
// wave sửa sau Panel #03 (điều kiện chấm lại §9). Đo trên BẢN BUILD
// LOCAL (không đo live — live là việc của re-panel).
//
// Cách chạy đầy đủ:
//   1) npx -y pnpm@10.32.1 build && npx -y pnpm@10.32.1 start -p 3100
//      (cổng 3100 = LOCAL_ORIGIN mặc định; đổi bằng GEO_LOCAL_ORIGIN)
//   2) Chrome headless với profile MỚI + tắt LNA checks (Chrome sandbox
//      chặn điều hướng loopback nếu thiếu các cờ này):
//        /opt/meta-chromium/chrome --headless=new --no-sandbox \
//          --disable-dev-shm-usage --disable-gpu \
//          --disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,LocalNetworkAccessRestrictions \
//          --remote-debugging-port=9321 \
//          --user-data-dir=<profile-mới> --window-size=420,900 about:blank
//   3) GEO_OUT=results.json node scripts/geometry-stress.mjs http://localhost:3100 9321
//      GEO_INTERCEPT=1: nếu loopback vẫn bị chặn, điều hướng qua origin
//      HTTPS thật + CDP Fetch interception trả nội dung từ build local.
//
// Bản gốc phát triển ở ~/workspace/mini-apps/tmp/geo/ (bản nháp của điều
// phối viên trước); bản này là bản chốt trong repo.
import fs from 'node:fs';

const BASE_URL = process.argv[2] || 'http://localhost:3100';
// GEO_INTERCEPT=1: Chrome bị LNA chặn điều hướng loopback, nên harness điều
// hướng tới origin HTTPS thật nhưng CHẶN mọi request bằng CDP Fetch và trả
// nội dung từ bản build local (LOCAL_ORIGIN) — công thức "CDP Fetch
// interception" các đợt đo trước đã dùng. sw.js được trả rỗng để service
// worker không cache lẫn bản live vào phiên đo.
const INTERCEPT = process.env.GEO_INTERCEPT === '1';
const NAV_BASE = INTERCEPT ? 'https://chiatien-five.vercel.app' : BASE_URL;
const LOCAL_ORIGIN = process.env.GEO_LOCAL_ORIGIN || 'http://localhost:3100';
const CDP = `http://127.0.0.1:${process.argv[3] || '9321'}`;
const OUT = process.env.GEO_OUT || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LONG_NAME = 'Nguyễn Văn Đức Anh Tuấn Kiệt Phương Thảo Linh'; // 45 ký tự
const BANK = {
  bin: '970436',
  bankName: 'Vietcombank',
  accountNumber: '0123456789',
  accountName: 'NGUYEN VAN BINH',
};

const SESSIONS = [
  {
    id: 's-short',
    title: 'Ăn trưa nhóm',
    members: [
      { id: 'a', name: 'An' },
      { id: 'b', name: 'Chi' },
      { id: 'c', name: 'Dũng' },
    ],
    expenses: [
      {
        id: 'e1',
        title: 'Phở',
        amount: 900000,
        payerId: 'a',
        participantIds: ['a', 'b', 'c'],
        mode: 'equal',
        custom: {},
        weights: {},
        createdAt: 1,
      },
    ],
    createdAt: 1,
    updatedAt: 3,
  },
  {
    id: 's-stress',
    title: 'Chuyến đi stress',
    members: [
      { id: 'a', name: LONG_NAME },
      { id: 'b', name: 'Bình', bank: BANK },
      { id: 'c', name: 'Chi' },
    ],
    expenses: [
      {
        id: 'e1',
        title: 'Tiền phòng, ăn uống và di chuyển cho cả nhóm đi Đà Lạt 3 ngày 2 đêm nữa',
        amount: 999999999999999,
        payerId: 'b',
        participantIds: ['a'],
        mode: 'equal',
        custom: {},
        weights: {},
        createdAt: 1,
      },
      {
        id: 'e2',
        title: 'Ăn tối',
        amount: 300000,
        payerId: 'b',
        participantIds: ['b', 'c'],
        mode: 'equal',
        custom: {},
        weights: {},
        createdAt: 2,
      },
    ],
    createdAt: 1,
    updatedAt: 2,
  },
  {
    id: 's-nobank',
    title: 'Nhậu cuối tuần',
    members: [
      { id: 'a', name: 'An' },
      { id: 'b', name: 'Bình' },
    ],
    expenses: [
      {
        id: 'e1',
        title: 'Bia',
        amount: 200000,
        payerId: 'b',
        participantIds: ['a', 'b'],
        mode: 'equal',
        custom: {},
        weights: {},
        createdAt: 1,
      },
    ],
    createdAt: 1,
    updatedAt: 1,
  },
];

const results = {
  baseUrl: BASE_URL,
  longNameLen: LONG_NAME.length,
  geometry: [],
  focus: [],
  extra: {},
};
const failures = [];
function check(label, ok, detail) {
  if (!ok) failures.push(`${label}: ${detail}`);
  return ok;
}

/* ---------------- CDP plumbing ---------------- */
const ver = await (await fetch(`${CDP}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
let nextId = 1;
const pending = new Map();
const eventHandlers = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  } else if (msg.method && eventHandlers.has(msg.method)) {
    for (const fn of eventHandlers.get(msg.method)) fn(msg.params, msg.sessionId);
  }
};
const onEvent = (method, fn) => {
  if (!eventHandlers.has(method)) eventHandlers.set(method, []);
  eventHandlers.get(method).push(fn);
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable');
await S('Runtime.enable');
await S('Network.enable');
if (INTERCEPT) {
  onEvent('Fetch.requestPaused', async (params, sessId) => {
    const { requestId, request } = params;
    try {
      const u = new URL(request.url);
      if (u.pathname === '/sw.js') {
        await send(
          'Fetch.fulfillRequest',
          {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'text/javascript' }],
            body: Buffer.from('/* harness do: SW vo hieu hoa trong phien do */').toString('base64'),
          },
          sessId,
        );
        return;
      }
      const res = await fetch(LOCAL_ORIGIN + u.pathname + u.search, { redirect: 'manual' });
      const buf = Buffer.from(await res.arrayBuffer());
      const headers = [];
      res.headers.forEach((value, name) => {
        if (['transfer-encoding', 'connection', 'content-length'].includes(name.toLowerCase()))
          return;
        headers.push({ name, value });
      });
      headers.push({ name: 'content-length', value: String(buf.length) });
      await send(
        'Fetch.fulfillRequest',
        {
          requestId,
          responseCode: res.status,
          responseHeaders: headers,
          body: buf.toString('base64'),
        },
        sessId,
      );
    } catch {
      await send('Fetch.failRequest', { requestId, errorReason: 'Failed' }, sessId).catch(() => {});
    }
  });
  await S('Fetch.enable', {
    patterns: [{ urlPattern: NAV_BASE + '*', requestStage: 'Request' }],
  });
}
try {
  await send('Browser.grantPermissions', {
    origin: new URL(NAV_BASE).origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
} catch {
  /* clipboard có thể không cấp được — harness có đường dự phòng execCommand */
}

async function ev(expression) {
  const r = await S('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    throw new Error(
      'EVAL: ' +
        JSON.stringify(r.exceptionDetails).slice(0, 400) +
        ' :: ' +
        expression.slice(0, 120),
    );
  }
  return r.result?.value;
}

async function waitFor(expr, timeout = 12000, label = expr) {
  const t0 = Date.now();
  for (;;) {
    const v = await ev(`Boolean(${expr})`).catch(() => false);
    if (v) return;
    if (Date.now() - t0 > timeout) throw new Error('waitFor timeout: ' + label);
    await sleep(250);
  }
}

/** Click chuột THẬT (CDP Input) vào tâm phần tử do expr trả về.
 * expr có thể trả về MỘT phần tử hoặc MẢNG ứng viên — app render song song
 * bản mobile + desktop (một bản display:none), nên luôn chọn ứng viên đầu
 * tiên CÓ KÍCH THƯỚC THẬT (đang hiển thị). */
async function clickEl(expr, label = expr) {
  const pt = await ev(`(() => {
    const found = ${expr};
    const list = Array.isArray(found) ? found : [found];
    const el = list.find((e) => {
      if (!e) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  })()`);
  if (!pt || pt.w === 0 || pt.h === 0) throw new Error('clickEl: không thấy phần tử ' + label);
  await S('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: pt.x,
    y: pt.y,
    button: 'left',
    clickCount: 1,
  });
  await S('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: pt.x,
    y: pt.y,
    button: 'left',
    clickCount: 1,
  });
  await sleep(120);
}

async function pressEscape() {
  await S('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
  await S('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
}

const DESCRIBE = `((el) => {
  if (!el || el === document.body) return { tag: 'BODY' };
  return {
    tag: el.tagName,
    aria: el.getAttribute && el.getAttribute('aria-label'),
    text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 48),
    row: el.getAttribute && el.getAttribute('data-expense-row'),
    stripSummary: el.hasAttribute && el.hasAttribute('data-strip-summary'),
  };
})`;

async function setViewport(width, mobile) {
  await S('Emulation.setDeviceMetricsOverride', {
    width,
    height: 844,
    deviceScaleFactor: 2,
    mobile,
  });
  await S('Emulation.setTouchEmulationEnabled', { enabled: mobile });
}

async function gotoHomeSeeded() {
  await S('Page.navigate', { url: NAV_BASE + '/' });
  await waitFor(
    `location.origin === ${JSON.stringify(new URL(NAV_BASE).origin)} && document.readyState === 'complete'`,
    20000,
    'load origin',
  );
  await sleep(600);
  await ev(`(() => {
    localStorage.setItem('chiatien:sessions:v1', ${JSON.stringify(JSON.stringify({ schemaVersion: 1, sessions: SESSIONS }))});
    return true;
  })()`);
  await S('Page.reload', {});
  await waitFor(`document.body.innerText.includes('Ăn trưa nhóm')`, 15000, 'seeded list');
  await sleep(400);
}

async function openSession(titlePart) {
  await clickEl(
    `[...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(titlePart)}) && b.closest('li'))`,
    'session row ' + titlePart,
  );
  await waitFor(`document.querySelector('[data-strip]')`, 8000, 'session open');
  await sleep(500);
}

/* ---------------- Đo hình học 1 phiên ---------------- */
async function measureSession(width, mobile, sessionTitle, tag) {
  await setViewport(width, mobile);
  await gotoHomeSeeded();
  await openSession(sessionTitle);
  const g = await ev(`(() => {
    const out = { innerW: window.innerWidth, docSW: document.documentElement.scrollWidth };
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; };
    // --- Strip thu gọn ---
    const summary = document.querySelector('[data-strip-summary]');
    out.summaryRect = summary ? rect(summary) : null;
    const rows = summary ? [...summary.children] : [];
    // Hàng header = hàng chứa nhãn «Quyết toán»; hàng lệnh = hàng CÒN
    // LẠI. (Bản đầu tìm hàng lệnh bằng "có svg + span font-figure" —
    // hàng header cũng khớp cả hai nên find() trả nhầm hàng header và
    // stripNames luôn rỗng; đã sửa sau lượt chạy 2026-10-23 của wave.)
    const headerLine = rows.find((r) => [...r.querySelectorAll('span')].some((s) => s.textContent.trim() === 'Quyết toán'));
    const transferLine = rows.find((r) => r !== headerLine && r.querySelector('svg'));
    const spansOf = (line) => line ? [...line.querySelectorAll(':scope > span')] : [];
    const nameInfo = (span) => span ? { text: span.textContent.trim().slice(0, 20), w: Math.round(span.getBoundingClientRect().width), cw: span.clientWidth, sw: span.scrollWidth, rect: rect(span) } : null;
    const tSpans = spansOf(transferLine);
    out.stripNames = tSpans.filter((s) => s.className.includes('truncate')).map(nameInfo);
    out.stripAmount = nameInfo(tSpans.find((s) => s.className.includes('font-figure')));
    out.stripPlus = nameInfo(tSpans.find((s) => /lệnh/.test(s.textContent)));
    const hSpans = spansOf(headerLine);
    out.stripTotal = nameInfo(hSpans.find((s) => s.className.includes('font-figure')));
    const settleSpan = hSpans.find((s) => s.textContent.includes('Quyết toán'));
    out.stripSettleLabel = settleSpan ? { rect: rect(settleSpan) } : null;
    out.stripAmountVsLabelOverlap = (() => {
      if (!settleSpan || !out.stripAmount) return null;
      const a = settleSpan.getBoundingClientRect();
      const b = tSpans.find((s) => s.className.includes('font-figure'))?.getBoundingClientRect();
      if (!b) return null;
      return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    })();
    // --- Ledger ---
    const sub = [...document.querySelectorAll('button[data-expense-row] span')].find((s) => /đã trả/.test(s.textContent));
    out.ledgerSubtitle = sub ? { cw: sub.clientWidth, sw: sub.scrollWidth, h: Math.round(sub.getBoundingClientRect().height), text: sub.textContent.trim().slice(0, 30) } : null;
    const amountCell = [...document.querySelectorAll('button[data-expense-row] > span')].find((s) => s.className.includes('font-figure'));
    out.ledgerAmount = amountCell ? { w: Math.round(amountCell.getBoundingClientRect().width), text: amountCell.textContent.trim() } : null;
    return out;
  })()`);
  g.tag = tag;
  g.width = width;
  results.geometry.push(g);
  check(`${tag}@${width} doc`, g.docSW <= g.innerW, `scrollWidth=${g.docSW} innerW=${g.innerW}`);
  for (const [i, n] of (g.stripNames || []).entries()) {
    check(`${tag}@${width} strip name ${i}`, n.w >= 20, `w=${n.w} text=${n.text}`);
  }
  check(
    `${tag}@${width} strip overlap`,
    g.stripAmountVsLabelOverlap === false,
    `overlap=${g.stripAmountVsLabelOverlap}`,
  );

  // --- Mở rộng Strip: hàng lệnh ---
  await clickEl(`document.querySelector('[data-strip-summary]')`, 'expand strip');
  await sleep(600);
  const rows = await ev(`(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    return [...document.querySelectorAll('[data-transfer-row]')].filter(vis).map((row) => {
      const nameSpans = [...row.querySelectorAll('.truncate')];
      const groups = [...row.querySelectorAll(':scope span.inline-flex')];
      const info = (s) => s ? { text: s.textContent.trim().slice(0, 20), w: Math.round(s.getBoundingClientRect().width), cw: s.clientWidth, sw: s.scrollWidth, truncated: s.scrollWidth > s.clientWidth + 1 } : null;
      const qr = [...row.querySelectorAll('button')].find((b) => b.textContent.includes('VietQR'));
      return {
        sender: info(nameSpans[0]),
        recipient: info(nameSpans[1]),
        groupTops: groups.map((gr) => Math.round(gr.getBoundingClientRect().top)),
        qr: qr ? { w: Math.round(qr.getBoundingClientRect().width), right: Math.round(qr.getBoundingClientRect().right) } : null,
      };
    });
  })()`);
  g.transferRows = rows;
  for (const [i, r] of rows.entries()) {
    if (r.recipient) {
      // "Đọc được" = bề rộng ≥24px HOẶC tên ngắn hiển thị nguyên vẹn
      // (không truncate — ví dụ tên 2 ký tự ~21px là đủ, không phải bị ép).
      check(
        `${tag}@${width} row${i} recipient readable`,
        r.recipient.w >= 24 || !r.recipient.truncated,
        `w=${r.recipient.w} truncated=${r.recipient.truncated}`,
      );
      if (r.recipient.truncated && r.sender && !r.sender.truncated) {
        check(
          `${tag}@${width} row${i} truncate discipline`,
          false,
          'người nhận bị cắt trong khi người gửi nguyên vẹn',
        );
      }
    }
    if (r.qr)
      check(`${tag}@${width} row${i} QR in frame`, r.qr.right <= width, `right=${r.qr.right}`);
  }
  // Thu gọn lại
  await clickEl(`document.querySelector('[data-strip-summary]')`, 'collapse strip');
  await sleep(400);
  return g;
}

/* ---------------- Sheet khoản chi (Finding B) ---------------- */
async function measureExpenseSheet(width) {
  await setViewport(width, true);
  await gotoHomeSeeded();
  await openSession('Chuyến đi stress');
  await clickEl(
    `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Thêm khoản') && b.closest('[data-strip]'))`,
    'deck add expense',
  );
  await waitFor(`document.querySelector('[role="dialog"]')`, 8000, 'expense sheet open');
  await sleep(500);
  const m = await ev(`(() => {
    const dlg = document.querySelector('[role="dialog"]');
    const r = dlg.getBoundingClientRect();
    const inFrame = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), w: Math.round(b.width) }; };
    const dong = [...dlg.querySelectorAll('span')].find((s) => s.textContent === '₫');
    const selectAllBtn = [...dlg.querySelectorAll('button')].find((b) => /chọn tất cả/.test(b.textContent));
    const chips = [...dlg.querySelectorAll('button[aria-pressed="true"], button[aria-checked="true"]')];
    const chipWithCheck = chips.find((c) => c.querySelector('svg'));
    const chipName = chips[0]?.querySelector('.truncate');
    return {
      dialog: { sw: dlg.scrollWidth, cw: dlg.clientWidth, scrollLeft: dlg.scrollLeft, rect: inFrame(dlg) },
      dong: inFrame(dong),
      selectAllBtn: inFrame(selectAllBtn),
      selectedChip: inFrame(chipWithCheck || chips[0]),
      chipName: chipName ? { cw: chipName.clientWidth, sw: chipName.scrollWidth, text: chipName.textContent.trim().slice(0, 20) } : null,
      saveBtn: inFrame([...dlg.querySelectorAll('button')].find((b) => /Thêm khoản chi|Lưu thay đổi/.test(b.textContent))),
    };
  })()`);
  m.width = width;
  results.extra['expenseSheet@' + width] = m;
  check(
    `sheet@${width} scrollWidth==clientWidth`,
    m.dialog.sw <= m.dialog.cw,
    `sw=${m.dialog.sw} cw=${m.dialog.cw}`,
  );
  check(
    `sheet@${width} scrollLeft=0`,
    m.dialog.scrollLeft === 0,
    `scrollLeft=${m.dialog.scrollLeft}`,
  );
  if (m.dong)
    check(
      `sheet@${width} ₫ in frame`,
      m.dong.right <= width && m.dong.left >= 0,
      JSON.stringify(m.dong),
    );
  if (m.selectAllBtn)
    check(
      `sheet@${width} select-all in frame`,
      m.selectAllBtn.right <= width,
      JSON.stringify(m.selectAllBtn),
    );
  if (m.selectedChip)
    check(
      `sheet@${width} chip in frame`,
      m.selectedChip.right <= width,
      JSON.stringify(m.selectedChip),
    );
  await pressEscape();
  await sleep(500);
}

/* ---------------- Sheet không che Strip (Finding E) ---------------- */
async function measureSheetVsStrip(width) {
  await setViewport(width, true);
  await gotoHomeSeeded();
  await openSession('Ăn trưa nhóm');
  const before = await ev(`(() => {
    const strip = document.querySelector('[data-strip]');
    const r = strip.getBoundingClientRect();
    return { stripTop: Math.round(r.top), stripBottom: Math.round(r.bottom), cssVar: getComputedStyle(document.querySelector('[data-strip]')).getPropertyValue('--strip-h') };
  })()`);
  await clickEl(
    `[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Chia sẻ link')`,
    'deck share',
  );
  await waitFor(`document.querySelector('[role="dialog"]')`, 8000, 'share sheet');
  await sleep(500);
  const m = await ev(`(() => {
    const wrap = document.querySelector('[role="dialog"]').parentElement;
    const wr = wrap.getBoundingClientRect();
    const strip = document.querySelector('[data-strip]');
    const sr = strip.getBoundingClientRect();
    const summary = document.querySelector('[data-strip-summary]');
    const topEl = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.round(sr.top + 6));
    return {
      wrapBottom: Math.round(wr.bottom),
      stripTop: Math.round(sr.top),
      summaryVisibleText: summary ? summary.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60) : null,
      elementAtStripTop: topEl ? (topEl.closest('[data-strip]') ? 'STRIP' : topEl.tagName + '.' + String(topEl.className).slice(0, 40)) : null,
    };
  })()`);
  results.extra['sheetVsStrip@' + width] = { before, ...m };
  check(
    `E@${width} sheet bottom <= strip top`,
    m.wrapBottom <= m.stripTop + 1,
    `wrapBottom=${m.wrapBottom} stripTop=${m.stripTop}`,
  );
  check(
    `E@${width} strip top not covered`,
    m.elementAtStripTop === 'STRIP',
    `elementAtStripTop=${m.elementAtStripTop}`,
  );
  await pressEscape();
  await sleep(500);
}

/* ---------------- Ma trận Esc-focus (Finding G) ---------------- */
async function focusCase(name, openFn) {
  await setViewport(390, true);
  await gotoHomeSeeded();
  await openSession('Chuyến đi stress');
  await openFn();
  await waitFor(`document.querySelector('[role="dialog"]')`, 8000, name + ' dialog');
  await sleep(350);
  const openerDesc = await ev(`${DESCRIBE}(document.activeElement)`);
  await pressEscape();
  await sleep(650);
  const after = await ev(`${DESCRIBE}(document.activeElement)`);
  const stillOpen = await ev(`Boolean(document.querySelector('[role="dialog"]'))`);
  const ok = !stillOpen && after.tag !== 'BODY';
  results.focus.push({ name, openerDesc, after, stillOpen, ok });
  check('focus ' + name, ok, `after=${JSON.stringify(after)} stillOpen=${stillOpen}`);
  if (stillOpen) {
    await ev(`document.querySelector('[role="dialog"] button[aria-label="Đóng"]')?.click()`);
    await sleep(400);
  }
}

const byText = (t, extra = '') =>
  `[...document.querySelectorAll('button')].filter((b) => b.textContent.includes(${JSON.stringify(t)}) ${extra})`;

function checkpoint() {
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ ...results, failures }, null, 1));
}

/* ---------------- Chạy ---------------- */
console.log('BASE', BASE_URL);
for (const w of [320, 360, 375, 390, 412]) {
  await measureSession(w, true, 'Chuyến đi stress', 'stress');
  checkpoint();
}
await measureSession(390, true, 'Ăn trưa nhóm', 'short');
for (const w of [1150, 1440]) {
  await setViewport(w, false);
  await gotoHomeSeeded();
  await openSession('Chuyến đi stress');
  const g = await ev(`(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const rows = [...document.querySelectorAll('[data-transfer-row]')].filter(vis).map((row) => {
      const nameSpans = [...row.querySelectorAll('.truncate')];
      const info = (s) => s ? { text: s.textContent.trim().slice(0, 20), w: Math.round(s.getBoundingClientRect().width), cw: s.clientWidth, sw: s.scrollWidth, truncated: s.scrollWidth > s.clientWidth + 1 } : null;
      return { sender: info(nameSpans[0]), recipient: info(nameSpans[1]) };
    });
    return { innerW: window.innerWidth, docSW: document.documentElement.scrollWidth, rows };
  })()`);
  g.tag = 'desktop';
  g.width = w;
  results.geometry.push(g);
  for (const [i, r] of g.rows.entries()) {
    if (r.recipient) {
      check(
        `desktop@${w} row${i} recipient intact`,
        !r.recipient.truncated,
        `recipient=${JSON.stringify(r.recipient)}`,
      );
    }
  }
}
for (const w of [320, 390]) await measureExpenseSheet(w);
checkpoint();
await measureSheetVsStrip(390);
checkpoint();

/* Finding F — clipboard của «Nhắn xin QR» */
await setViewport(390, true);
await gotoHomeSeeded();
await openSession('Nhậu cuối tuần');
await clickEl(`document.querySelector('[data-strip-summary]')`, 'expand strip nobank');
await sleep(600);
await ev(`(() => {
  window.__copied = null;
  try {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } },
      configurable: true,
    });
  } catch { /* fallback execCommand của app */ }
  return true;
})()`);
await clickEl(byText('Nhắn xin QR của'), 'ask QR');
await sleep(500);
const copied = await ev(`window.__copied`);
results.extra.askClipboard = copied;
check(
  'F clipboard is QR request',
  typeof copied === 'string' &&
    copied.includes('Bình') &&
    copied.includes('mã QR') &&
    !copied.startsWith('Đây là link chốt tiền'),
  `copied=${String(copied).slice(0, 80)}`,
);
await ev(`location.reload()`);
await sleep(800);

/* Finding G — ma trận */
await focusCase('member-sheet (chip)', async () => {
  await clickEl(
    `[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Bình')`,
    'member chip',
  );
});
await focusCase('share-sheet (deck)', async () => {
  await clickEl(
    `[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Chia sẻ link')`,
    'share btn',
  );
});
await focusCase('expense-sheet (deck)', async () => {
  await clickEl(byText('Thêm khoản', `&& b.closest('[data-strip]')`), 'add expense');
});
await focusCase('expense-edit (chain row→action→sửa)', async () => {
  await clickEl(`document.querySelector('[data-expense-row]')`, 'ledger row');
  await waitFor(`document.querySelector('[role="dialog"]')`, 8000, 'action sheet');
  await sleep(300);
  await clickEl(byText('Sửa khoản chi'), 'edit action');
});
await focusCase('delete-expense confirm (chain)', async () => {
  await clickEl(`document.querySelector('[data-expense-row]')`, 'ledger row');
  await waitFor(`document.querySelector('[role="dialog"]')`, 8000, 'action sheet');
  await sleep(300);
  await clickEl(byText('Xoá khoản chi'), 'delete action');
});
await focusCase('session-actions (⋯)', async () => {
  await clickEl(
    `[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Hành động của cuộc chia')`,
    'dots',
  );
});
await focusCase('delete-session confirm (chain ⋯)', async () => {
  await clickEl(
    `[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Hành động của cuộc chia')`,
    'dots',
  );
  await waitFor(`document.querySelector('[role="dialog"]')`, 8000, 'session actions');
  await sleep(300);
  await clickEl(byText('Xoá cuộc chia'), 'delete session action');
});
await focusCase('qr-sheet (strip panel)', async () => {
  await clickEl(`document.querySelector('[data-strip-summary]')`, 'expand strip');
  await sleep(600);
  await clickEl(byText('VietQR'), 'qr button');
});

results.failures = failures;
console.log(JSON.stringify(results, null, 1).slice(0, 12000));
console.log('FAILURES:', failures.length);
for (const f of failures) console.log(' -', f);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
await send('Target.closeTarget', { targetId }).catch(() => {});
ws.close();
process.exit(failures.length ? 1 : 0);
