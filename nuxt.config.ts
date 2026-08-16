import fs from 'node:fs';
import path from 'node:path';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  nitro: {
    experimental: {
      websocket: true
    },
    hooks: {
      'compiled'(nitro) {
        try {
          const serverDir = nitro.options.output.serverDir;
          const preloadFile = path.resolve(serverDir, 'preload-ssl.mjs');
          const entryFile = path.resolve(serverDir, 'index.mjs');

          const sslPreloadContent = `import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

// Auto-initialize self-signed SSL certs for OOTB HTTPS / WSS in all environments (Systemd, AUR, CLI)
try {
  const homeDir = process.env.HOME || (process.getuid && process.getuid() === 0 ? '/root' : os.homedir());
  const dataDir = process.env.CONTROL_CENTER_DATA || path.join(homeDir, '.controlcenter');
  const certsDir = path.join(dataDir, 'certs');
  const certPath = path.join(certsDir, 'cert.pem');
  const keyPath = path.join(certsDir, 'key.pem');

  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true, mode: 0o700 });
  }

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    const hostname = os.hostname() || 'localhost';
    const sanList = ['DNS:localhost', 'DNS:' + hostname, 'IP:127.0.0.1', 'IP:0.0.0.0'];
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
          if (net.family === 'IPv4' && !net.internal) {
            sanList.push('IP:' + net.address);
          }
        }
      }
    } catch {}
    const opensslCmd = 'openssl req -x509 -newkey rsa:2048 -nodes -keyout ' + JSON.stringify(keyPath) + ' -out ' + JSON.stringify(certPath) + ' -days 3650 -subj "/CN=ControlCenter/O=ControlCenter" -addext "subjectAltName=' + sanList.join(',') + '"';
    execSync(opensslCmd, { stdio: 'ignore' });
    try { fs.chmodSync(keyPath, 0o600); } catch {}
    try { fs.chmodSync(certPath, 0o644); } catch {}
  }

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    if (!process.env.NITRO_SSL_CERT) {
      process.env.NITRO_SSL_CERT = fs.readFileSync(certPath, 'utf8');
    }
    if (!process.env.NITRO_SSL_KEY) {
      process.env.NITRO_SSL_KEY = fs.readFileSync(keyPath, 'utf8');
    }
  }
} catch (e) {
  console.warn('[ControlCenter] Auto-SSL preload warning:', e.message);
}
`;
          fs.writeFileSync(preloadFile, sslPreloadContent, 'utf8');

          if (fs.existsSync(entryFile)) {
            const original = fs.readFileSync(entryFile, 'utf8');
            if (!original.includes('preload-ssl.mjs')) {
              fs.writeFileSync(entryFile, `import './preload-ssl.mjs';\n` + original, 'utf8');
            }
          }
        } catch (err: any) {
          console.error('[Nuxt] Error injecting SSL preload:', err.message);
        }
      }
    }
  },
  tailwindcss: {
    viewer: false,
  },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'ControlCenter - Cockpit',
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon.ico'
        },
      ]
    }
  }
})