import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { environment } from '~/core/globals';

let cachedFingerprint: string = '';

export function ensureSelfSignedCert(): { certPem: string; keyPem: string; fingerprint: string } | null {
  try {
    if (!fs.existsSync(environment.paths.certs)) {
      fs.mkdirSync(environment.paths.certs, { recursive: true, mode: 0o700 });
    }

    const certPath = environment.files.cert;
    const keyPath = environment.files.key;

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.log('[CertManager] Generating self-signed SSL certificate for OOTB HTTPS...');

      // Gather local IP addresses for Subject Alternative Names (SAN)
      const ips = new Set<string>(['127.0.0.1']);
      const hostname = os.hostname() || 'localhost';

      try {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
          for (const net of interfaces[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
              ips.add(net.address);
            }
          }
        }
      } catch {}

      const sanList: string[] = ['DNS:localhost', `DNS:${hostname}`];
      ips.forEach((ip) => sanList.push(`IP:${ip}`));
      const sanString = sanList.join(',');

      const opensslCmd = `openssl req -x509 -newkey rsa:2048 -nodes -keyout ${JSON.stringify(keyPath)} -out ${JSON.stringify(certPath)} -days 3650 -subj "/CN=ControlCenter/O=ControlCenter" -addext "subjectAltName=${sanString}"`;

      execSync(opensslCmd, { stdio: 'ignore' });
      try { fs.chmodSync(keyPath, 0o600); } catch {}
      try { fs.chmodSync(certPath, 0o644); } catch {}
      console.log('[CertManager] SSL Certificate successfully generated at:', certPath);
    }

    const certPem = fs.readFileSync(certPath, 'utf8');
    const keyPem = fs.readFileSync(keyPath, 'utf8');

    // Compute SHA-256 fingerprint using Node.js X509Certificate
    try {
      const x509 = new crypto.X509Certificate(certPem);
      cachedFingerprint = x509.fingerprint256.replace(/:/g, '').toUpperCase();
    } catch {
      // Fallback fingerprint calculation
      const base64Der = certPem
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s+/g, '');
      const der = Buffer.from(base64Der, 'base64');
      cachedFingerprint = crypto.createHash('sha256').update(der).digest('hex').toUpperCase();
    }

    return {
      certPem,
      keyPem,
      fingerprint: cachedFingerprint
    };
  } catch (err: any) {
    console.error('[CertManager] Error ensuring self-signed certificate:', err.message);
    return null;
  }
}

export function getCertFingerprint(): string {
  if (cachedFingerprint) return cachedFingerprint;
  const certs = ensureSelfSignedCert();
  return certs?.fingerprint || '';
}
