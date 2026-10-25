// demo-proxy.mjs — forward proxy tối thiểu cho pipeline render atlas:
// Chrome -> proxy này (127.0.0.1:18097) -> server tĩnh local (mặc định
// 127.0.0.1:9178, đổi bằng env STATIC_PORT). Mọi host đều ánh xạ về server
// tĩnh (driver dùng http://atlas.test/). Lý do: Chromium 152 chặn điều hướng
// trực tiếp tới localhost (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS) —
// công thức đã kiểm chứng ở demo C / đợt prototype.
import http from 'node:http';
import net from 'node:net';

const UP = { host: '127.0.0.1', port: parseInt(process.env.STATIC_PORT || '9178', 10) };
const server = http.createServer((req, res) => {
  let path = '/';
  try { const u = new URL(req.url); path = u.pathname + u.search; } catch { path = req.url || '/'; }
  const upstream = http.request(
    { host: UP.host, port: UP.port, path, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${UP.port}` } },
    (up) => { res.writeHead(up.statusCode ?? 502, up.headers); up.pipe(res); },
  );
  upstream.on('error', (e) => { if (!res.headersSent) res.writeHead(502); res.end('proxy err ' + e.message); });
  req.pipe(upstream);
});
server.on('connect', (req, clientSocket, head) => {
  const upstream = net.connect(UP.port, UP.host, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head && head.length) upstream.write(head);
    upstream.pipe(clientSocket); clientSocket.pipe(upstream);
  });
  upstream.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => upstream.destroy());
});
server.listen(18097, '127.0.0.1', () => console.log('atlas proxy on 18097 -> 127.0.0.1:' + UP.port));
