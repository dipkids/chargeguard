/**
 * CHARGEGUARD - Lightweight Node.js Local Server
 * Zero external dependencies! Uses Node.js built-in http, fs, path, os modules.
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper to get local LAN IP addresses (Wi-Fi / Ethernet)
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  let cleanUrl = req.url.split('?')[0];
  if (cleanUrl === '/' || cleanUrl === '') {
    cleanUrl = '/index.html';
  }

  const filePath = path.join(BASE_DIR, cleanUrl);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPAddresses();

  console.log('\n==========================================================');
  console.log('🛡️  CHARGEGUARD LOCAL SERVER RUNNING');
  console.log('==========================================================');
  console.log(`💻 Local Laptop:   http://localhost:${PORT}`);
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      console.log(`📱 LAN Network:    http://${ip}:${PORT}`);
    });
  }
  console.log('----------------------------------------------------------');
  console.log('⚠️  PENTING UNTUK PENGUJIAN SENSOR ANDROID:');
  console.log('Browser Android (Chrome) mewajibkan HTTPS untuk Battery API & DeviceMotion!');
  console.log('Untuk menjalankan dengan HTTPS secara instan & gratis:');
  console.log(`   npx cloudflared tunnel --url http://localhost:${PORT}`);
  console.log(`   atau`);
  console.log(`   npx ngrok http ${PORT}`);
  console.log('==========================================================\n');
});
