/**
 * Service worker — Chia Tiền (W5-01, viết tay, không thư viện).
 *
 * Chiến lược cache:
 * - App shell (cache `shell`): precache các URL ỔN ĐỊNH (không hash)
 *   lúc install — trang gốc, manifest, icon PWA, favicon, logo và
 *   hero chính (hero-split) — để app mở được offline ngay từ lần
 *   tải thứ hai.
 * - Runtime (cache `runtime`): tài nguyên biến thiên theo bản build.
 *   `/_next/static/` dùng cache-first (tên file có hash nội dung,
 *   không bao giờ đổi nội dung dưới cùng một URL); static khác
 *   (icon/ảnh/font) stale-while-revalidate; điều hướng (navigation)
 *   network-first, mất mạng thì trả app shell '/' đã cache; request
 *   GET same-origin còn lại network-first có fallback cache.
 * - Chỉ can thiệp GET same-origin. Cross-origin: bỏ qua hoàn toàn
 *   (không respondWith) — app không còn request ngoài nào, và SW
 *   không được phép đụng vào request của origin khác.
 *
 * Cách bump version khi deploy bản mới: tăng CACHE_VERSION (đặt theo
 * ngày deploy, vd 'v3-2026-11-01'). activate() xoá MỌI cache không
 * thuộc version hiện tại, nên chỉ cần đổi hằng số này là client tự
 * dọn cache cũ và precache lại shell mới ở lần ghé tiếp theo.
 */

const CACHE_VERSION = 'v10-2026-10-25';
const SHELL_CACHE = `chiatien-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `chiatien-runtime-${CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

/* Họ cache GAME — tách riêng, version ĐỘC LẬP (ARCHITECTURE §7, T5):
 * gameVersion không suy ra từ CACHE_VERSION. Asset của game (chunk JS,
 * atlas, audio) sống trong họ `chiatien-game-v<gameVersion>`; game KHÔNG
 * được precache cùng app shell — chỉ cache-first khi fetch lần đầu lúc
 * người dùng mở game. Bump CACHE_VERSION của app KHÔNG được xoá cache
 * game còn tương thích; lỗi họ game không bao giờ chặn activate của shell. */
const GAME_VERSION = '1';
const GAME_CACHE_PREFIX = 'chiatien-game-v';
const GAME_CACHE = `${GAME_CACHE_PREFIX}${GAME_VERSION}`;

// URL ổn định (không hash) — precache lúc install.
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
  '/products/brand/chiatien-logo.svg',
  '/products/brand/hero-split.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        // Họ game: giữ tối đa 2 cache mới nhất (đang hoạt động + version
        // ngay trước), dọn chỉ trong họ game — việc dọn này bọc try/catch
        // riêng để lỗi họ game không bao giờ chặn activate của shell.
        const gameKeys = keys
          .filter((key) => key.startsWith(GAME_CACHE_PREFIX))
          .sort((a, b) => {
            const va = Number.parseInt(a.slice(GAME_CACHE_PREFIX.length), 10) || 0;
            const vb = Number.parseInt(b.slice(GAME_CACHE_PREFIX.length), 10) || 0;
            return vb - va;
          });
        const staleGameKeys = gameKeys.slice(2);
        const shellKeysToDelete = keys.filter(
          (key) => !CURRENT_CACHES.includes(key) && !key.startsWith(GAME_CACHE_PREFIX),
        );
        return Promise.all([
          ...shellKeysToDelete.map((key) => caches.delete(key)),
          ...staleGameKeys.map((key) =>
            caches.delete(key).catch(() => false),
          ),
        ]);
      })
      .then(() => self.clients.claim()),
  );
});

/** stale-while-revalidate: trả cache ngay (nếu có) + tải mới nền để cập nhật cache. */
function staleWhileRevalidate(request) {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
}

/** cache-first: dùng cho tài nguyên tên file có hash (/_next/static/). */
function cacheFirst(request) {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    cache.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        }),
    ),
  );
}

/** cache-first trong HỌ GAME (ARCH §7): miss thì fetch + put vào cache game hiện tại. */
function gameCacheFirst(request) {
  return caches.open(GAME_CACHE).then((cache) =>
    cache.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        }),
    ),
  );
}

/** network-first: ưu tiên bản mới; mất mạng thì lùi về cache (nếu có). */
function networkFirst(request, fallbackUrl) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (fallbackUrl) {
        const shell = await caches.match(fallbackUrl);
        if (shell) return shell;
      }
      throw new Error('offline và không có bản cache cho request này');
    });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Chỉ can thiệp GET; method khác (POST…) đi thẳng ra mạng.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin: bỏ qua, không respondWith.
  if (url.origin !== self.location.origin) return;

  // Điều hướng trang: network-first, offline thì trả app shell '/'.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/'));
    return;
  }

  // Asset tĩnh của game (public/game/): cache-first trong HỌ GAME riêng.
  // Đặt TRƯỚC nhánh static chung để audio/atlas của game không rơi vào
  // runtime cache của shell. Không precache — chỉ cache khi fetch lần đầu.
  if (url.pathname.startsWith('/game/')) {
    event.respondWith(gameCacheFirst(request));
    return;
  }

  // Bundle Next có hash trong tên file: cache-first vào runtime cache.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Static khác (icon, ảnh, font, manifest, logo): stale-while-revalidate.
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/products/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico' ||
    /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|ttf|css)$/.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Còn lại (GET same-origin): network-first có fallback cache.
  event.respondWith(networkFirst(request));
});
