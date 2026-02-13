import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port = Number(process.env.PORT || 5173);
const indexPath = resolve(process.cwd(), 'apps/web-lite/index.html');

const server = createServer(async (_req, res) => {
  try {
    const html = await readFile(indexPath, 'utf8');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Failed to load fallback dashboard.');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Lite dashboard running at http://127.0.0.1:${port}`);
});
