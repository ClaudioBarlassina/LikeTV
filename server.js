const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROXY_TARGET = 'https://worldcup26.ir';
const DATA_FILE = path.join(__dirname, 'data', 'subscriptions.json');
const ADMIN_DIR = path.join(__dirname, 'admin');
const PORT = process.env.PORT || 4000;

const M3U8_CACHE = {};
const M3U8_CACHE_TTL = 3000;

setInterval(() => {
  const now = Date.now();
  for (const key in M3U8_CACHE) {
    if (now - M3U8_CACHE[key].ts > M3U8_CACHE_TTL) delete M3U8_CACHE[key];
  }
}, M3U8_CACHE_TTL * 2);

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    const init = {
      admin: { password: 'admin123' },
      codes: [],
      channels: [
        { id: 'telefe', name: 'Telefe', country: 'Argentina', logo: null, streamUrl: null, note: 'Disponible durante el Mundial' },
        { id: 'espn', name: 'ESPN', country: 'Argentina', logo: null, streamUrl: null, note: 'Disponible durante el Mundial' },
        { id: 'tycsports', name: 'TyC Sports', country: 'Argentina', logo: null, streamUrl: null, note: 'Disponible durante el Mundial' },
      ],
    };
    writeData(init);
    return init;
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function generateCode() {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `WC26-${rand.slice(0, 4)}-${rand.slice(4, 8)}`;
}

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const method = req.method;
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

function proxyRequest(targetUrl, res, contentType) {
  const transport = targetUrl.protocol === 'https:' ? https : http;
  const reqOpts = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  };
  const proxyReq = transport.request(reqOpts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': contentType || proxyRes.headers['content-type'] || 'application/octet-stream',
    });
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) { res.writeHead(502); }
    res.end(JSON.stringify({ error: err.message }));
  });
  proxyReq.setTimeout(15000, () => {
    proxyReq.destroy(new Error('Proxy timeout'));
  });
  proxyReq.end();
}

function isM3u8Response(proxyRes, targetUrl) {
  const ct = proxyRes.headers['content-type'] || '';
  if (ct.includes('mpegurl') || ct.includes('x-mpegURL')) return true;
  if (targetUrl.href.includes('.m3u8')) return true;
  return false;
}

function fetchStreamWithRedirect(targetUrl, res, redirects = 0) {
  if (redirects > 5) {
    if (!res.headersSent) { res.writeHead(502); }
    res.end(JSON.stringify({ error: 'Too many redirects' }));
    return;
  }

  const urlStr = targetUrl.href;
  if (urlStr.includes('.m3u8')) {
    const cached = M3U8_CACHE[urlStr];
    if (cached && Date.now() - cached.ts < M3U8_CACHE_TTL) {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/x-mpegURL',
      });
      res.end(cached.body);
      return;
    }
  }

  const transport = targetUrl.protocol === 'https:' ? https : http;
  const proxyReq = transport.request({
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  }, (proxyRes) => {
    // Follow redirects (302, 301, 307, 308)
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      proxyRes.resume();
      const redirectUrl = new URL(proxyRes.headers.location, targetUrl.origin);
      console.log(`  → Redirect: ${targetUrl.href}`);
      console.log(`  →   to: ${redirectUrl.href}`);
      fetchStreamWithRedirect(redirectUrl, res, redirects + 1);
      return;
    }

    // M3U8: collect as string and rewrite relative URLs
    if (isM3u8Response(proxyRes, targetUrl)) {
      const chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const base = targetUrl.href.substring(0, targetUrl.href.lastIndexOf('/') + 1);
        const proxyBase = `/proxy/video?url=`;
        const rewritten = body.split('\n').map((line) => {
          const t = line.trim();
          if (t && !t.startsWith('#') && !t.startsWith('http://') && !t.startsWith('https://')) {
            const fullUrl = t.startsWith('/') ? new URL(t, targetUrl.origin).href : base + t;
            return proxyBase + encodeURIComponent(fullUrl);
          }
          return line;
        }).join('\n');
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/x-mpegURL',
        });
        M3U8_CACHE[urlStr] = { body: rewritten, ts: Date.now() };
        res.end(rewritten);
      });
      return;
    }

    // Binary segment (TS, etc) — stream as-is
    res.writeHead(proxyRes.statusCode, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': proxyRes.headers['content-type'] || 'video/MP2T',
    });
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) { res.writeHead(502); }
    res.end(JSON.stringify({ error: err.message }));
  });
  proxyReq.setTimeout(15000, () => {
    proxyReq.destroy(new Error('Proxy timeout'));
  });
  proxyReq.end();
}

  // ─── PROXY: /get/* → worldcup26.ir ─────────────────────────
  if (pathname.startsWith('/get/')) {
    const targetUrl = new URL(PROXY_TARGET + pathname + parsedUrl.search);
    console.log(`  → ${targetUrl.href}`);
    proxyRequest(targetUrl, res);
    return;
  }

  // ─── PROXY: /proxy/video — M3U8 stream proxy (fixes CORS + redirects) ──
  if (pathname === '/proxy/video' && method === 'GET') {
    const videoUrl = parsedUrl.searchParams.get('url');
    if (!videoUrl) { jsonResponse(res, 400, { error: 'Missing url param' }); return; }
    console.log(`  → Video proxy: ${videoUrl}`);
    fetchStreamWithRedirect(new URL(videoUrl), res);
    return;
  }

  // ─── API: Admin login ──────────────────────────────────────
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await parseBody(req);
    const data = readData();
    if (body.password === data.admin.password) {
      const token = crypto.randomBytes(16).toString('hex');
      data.admin.token = token;
      writeData(data);
      jsonResponse(res, 200, { success: true, token });
    } else {
      jsonResponse(res, 401, { success: false, error: 'Contraseña incorrecta' });
    }
    return;
  }

  // ─── API: Admin verify token ────────────────────────────────
  function isAdmin(req) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return false;
    const data = readData();
    return auth.slice(7) === data.admin.token;
  }

  // ─── API: List codes ───────────────────────────────────────
  if (pathname === '/api/admin/codes' && method === 'GET') {
    if (!isAdmin(req)) { jsonResponse(res, 401, { error: 'No autorizado' }); return; }
    const data = readData();
    jsonResponse(res, 200, data.codes);
    return;
  }

  // ─── API: Create code ──────────────────────────────────────
  if (pathname === '/api/admin/codes' && method === 'POST') {
    if (!isAdmin(req)) { jsonResponse(res, 401, { error: 'No autorizado' }); return; }
    const body = await parseBody(req);
    const data = readData();
    const days = body.days || 30;
    const now = new Date();
    const expires = new Date(now.getTime() + days * 86400000);
    const code = {
      id: crypto.randomUUID(),
      code: generateCode(),
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: 'active',
      redeemedAt: null,
      deviceId: null,
      deviceName: null,
    };
    data.codes.push(code);
    writeData(data);
    jsonResponse(res, 201, code);
    return;
  }

  // ─── API: Revoke/delete code ───────────────────────────────
  if (pathname.startsWith('/api/admin/codes/') && method === 'DELETE') {
    if (!isAdmin(req)) { jsonResponse(res, 401, { error: 'No autorizado' }); return; }
    const codeId = pathname.split('/').pop();
    const data = readData();
    data.codes = data.codes.filter((c) => c.id !== codeId);
    writeData(data);
    jsonResponse(res, 200, { success: true });
    return;
  }

  // ─── API: Get channels ─────────────────────────────────────
  if (pathname === '/api/admin/channels' && method === 'GET') {
    if (!isAdmin(req)) { jsonResponse(res, 401, { error: 'No autorizado' }); return; }
    const data = readData();
    jsonResponse(res, 200, data.channels);
    return;
  }

  // ─── API: Update channels ──────────────────────────────────
  if (pathname === '/api/admin/channels' && method === 'PUT') {
    if (!isAdmin(req)) { jsonResponse(res, 401, { error: 'No autorizado' }); return; }
    const body = await parseBody(req);
    const data = readData();
    data.channels = body.channels || data.channels;
    writeData(data);
    jsonResponse(res, 200, { success: true, channels: data.channels });
    return;
  }

  // ─── API: Change admin password ─────────────────────────────
  if (pathname === '/api/admin/password' && method === 'PUT') {
    if (!isAdmin(req)) { jsonResponse(res, 401, { error: 'No autorizado' }); return; }
    const body = await parseBody(req);
    const data = readData();
    if (body.currentPassword !== data.admin.password) {
      jsonResponse(res, 400, { error: 'Contraseña actual incorrecta' });
      return;
    }
    data.admin.password = body.newPassword;
    writeData(data);
    jsonResponse(res, 200, { success: true });
    return;
  }

  // ─── API: Activate code (from TV) ──────────────────────────
  if (pathname === '/api/subscriptions/activate' && method === 'POST') {
    const body = await parseBody(req);
    const data = readData();
    const code = data.codes.find((c) => c.code === body.code);

    if (!code) {
      jsonResponse(res, 404, { success: false, error: 'Código no encontrado' });
      return;
    }
    if (code.status === 'redeemed') {
      jsonResponse(res, 400, { success: false, error: 'Código ya utilizado' });
      return;
    }
    if (code.status === 'revoked') {
      jsonResponse(res, 400, { success: false, error: 'Código revocado' });
      return;
    }
    if (new Date(code.expiresAt) < new Date()) {
      code.status = 'expired';
      writeData(data);
      jsonResponse(res, 400, { success: false, error: 'Código expirado' });
      return;
    }

    code.status = 'redeemed';
    code.redeemedAt = new Date().toISOString();
    code.deviceId = body.deviceId || 'unknown';
    code.deviceName = body.deviceName || 'TV';
    writeData(data);

    jsonResponse(res, 200, {
      success: true,
      expiresAt: code.expiresAt,
      channels: data.channels,
    });
    return;
  }

  // ─── API: Verify subscription ──────────────────────────────
  if (pathname === '/api/subscriptions/verify' && method === 'GET') {
    const deviceId = parsedUrl.searchParams.get('deviceId') || '';
    const data = readData();

    const active = data.codes.find(
      (c) => c.deviceId === deviceId && c.status === 'redeemed' && new Date(c.expiresAt) > new Date()
    );

    if (active) {
      jsonResponse(res, 200, {
        valid: true,
        expiresAt: active.expiresAt,
        channels: data.channels,
      });
    } else {
      jsonResponse(res, 200, { valid: false, channels: data.channels });
    }
    return;
  }

  // ─── API: Public channels (no auth, for TV app) ─────────────
  if (pathname === '/api/channels' && method === 'GET') {
    const data = readData();
    jsonResponse(res, 200, data.channels);
    return;
  }

  // ─── SERVE: Admin panel ────────────────────────────────────
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const filePath = pathname === '/admin'
      ? path.join(ADMIN_DIR, 'index.html')
      : path.join(ADMIN_DIR, pathname.replace('/admin/', ''));
    try {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  // ─── 404 ────────────────────────────────────────────────────
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`DashTV server running on http://localhost:${PORT}`);
  console.log(`  Proxy  : /get/* → ${PROXY_TARGET}/get/*`);
  console.log(`  Admin  : http://localhost:${PORT}/admin`);
  console.log(`  API    : /api/admin/* /api/subscriptions/* /api/channels`);
});
