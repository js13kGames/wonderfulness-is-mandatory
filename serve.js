// static server for dist/ + POST /shot -> writes a PNG to shots/
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname + '/dist', SH = __dirname + '/shots';
fs.mkdirSync(SH, { recursive: true });
http.createServer((q, r) => {
  if (q.method === 'POST' && q.url.startsWith('/shot')) {
    let b = '';
    q.on('data', d => b += d);
    q.on('end', () => {
      const name = (new URL(q.url, 'http://x').searchParams.get('n') || 'shot') + '.png';
      const data = b.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(path.join(SH, name), Buffer.from(data, 'base64'));
      r.writeHead(200, { 'access-control-allow-origin': '*' }); r.end('ok');
    });
    return;
  }
  let f = q.url.split('?')[0]; if (f === '/') f = '/index.html';
  const p = path.join(ROOT, f);
  fs.readFile(p, (e, d) => {
    if (e) { r.writeHead(404); r.end('nope'); return }
    r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'text/plain', 'cache-control': 'no-store' });
    r.end(d);
  });
}).listen(8014, () => console.log('serve on 8014'));
