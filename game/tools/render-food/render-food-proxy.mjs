// render-food-proxy.mjs — forward proxy cho Chrome headless (cùng công thức
// demo C): Chrome -> proxy này (127.0.0.1:18098) -> server tĩnh 127.0.0.1:9178.
// Hostname ảo food.test tránh Chromium 152 chặn điều hướng tới localhost.
import http from 'node:http';
import net from 'node:net';

const UP = { host: '127.0.0.1', port: Number(process.env.FOOD_SERVE_PORT || 9178) };
const server = http.createServer((req, res) => {
  let p = '/';
  try {
    const u = new URL(req.url);
    p = u.pathname + u.search;
  } catch {
    p = req.url || '/';
  }
  const upstream = http.request(
    {
      host: UP.host,
      port: UP.port,
      path: p,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${UP.port}` },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', (e) => {
    if (!res.headersSent) res.writeHead(502);
    res.end('proxy err ' + e.message);
  });
  req.pipe(upstream);
});
server.on('connect', (req, clientSocket, head) => {
  const upstream = net.connect(UP.port, UP.host, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head && head.length) upstream.write(head);
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });
  upstream.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => upstream.destroy());
});
server.listen(18098, '127.0.0.1', () =>
  console.log('render-food proxy on 18098 -> 127.0.0.1:' + UP.port),
);
