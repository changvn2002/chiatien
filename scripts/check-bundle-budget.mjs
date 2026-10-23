#!/usr/bin/env node
/**
 * Kiểm ngân sách JS (PERF-08) từ output build thật:
 * - Đọc HTML đã prerender của route đầu tiên (.next/server/app/index.html),
 *   lấy mọi <script src="/_next/..."> = đúng tập JS trên critical path của
 *   lần tải đầu (chunk lazy/dynamic-import KHÔNG nằm trong HTML đầu nên
 *   không tính — đúng định nghĩa của mục).
 * - Gzip từng file (zlib, level 9) và cộng tổng — xấp xỉ JS transfer size
 *   trên đường truyền (phép đo chuẩn của mục là Lighthouse trên live;
 *   job này là hàng rào CI chống phình, số tuyệt đối có thể lệch nhẹ).
 * - So với perf-budget.json: vượt ngân sách đã khai HOẶC vượt trần cứng
 *   300 KB của checklist -> exit 1.
 */
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const budget = JSON.parse(readFileSync(path.join(root, 'perf-budget.json'), 'utf8'));
const htmlPath = path.join(root, '.next/server/app/index.html');
if (!existsSync(htmlPath)) {
  console.error('Chưa có .next/server/app/index.html — chạy `pnpm build` trước.');
  process.exit(2);
}
const html = readFileSync(htmlPath, 'utf8');
const srcs = [
  ...new Set([...html.matchAll(/<script[^>]+src="(\/_next\/[^"]+\.js)"/g)].map((m) => m[1])),
];

let total = 0;
const rows = [];
for (const src of srcs) {
  const file = path.join(root, '.next', src.replace('/_next/', ''));
  const raw = readFileSync(file);
  const gz = gzipSync(raw, { level: 9 }).length;
  total += gz;
  rows.push({ src, rawBytes: raw.length, gzipBytes: gz });
}
rows.sort((a, b) => b.gzipBytes - a.gzipBytes);
for (const r of rows) {
  console.log(
    `${String(r.gzipBytes).padStart(9)} B gzip  ${String(r.rawBytes).padStart(9)} B raw  ${r.src}`,
  );
}
console.log(
  `TỔNG JS critical path route '/': ${total} B gzip (${(total / 1024).toFixed(1)} KiB) / ngân sách ${budget.firstRouteJsGzipBudgetBytes} B, trần cứng ${budget.hardCapBytes} B`,
);
if (total > budget.hardCapBytes) {
  console.error(`FAIL: vượt trần cứng PERF-08 (${budget.hardCapBytes} B).`);
  process.exit(1);
}
if (total > budget.firstRouteJsGzipBudgetBytes) {
  console.error(
    `FAIL: vượt ngân sách đã khai trong perf-budget.json (${budget.firstRouteJsGzipBudgetBytes} B). Muốn nới phải có ADR và không quá +10%/release (PERF-08).`,
  );
  process.exit(1);
}
console.log('PASS: JS critical path trong ngân sách.');
