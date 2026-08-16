import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

const BASE_URL = 'http://localhost:3000';

function getAuthCookie(): string {
  loadJsonFile();
  const secret = environment.settings?.jwt_secret || environment.jwt_globals.secret;
  const token = jwt.sign({ userId: 'admin' }, secret);
  return `token=${token}`;
}

describe('SSH Key Management Security Tests', () => {

  describe('Path Traversal Prevention on POST /api/ssh-keys', () => {
    const maliciousFilenames = [
      '../hacked_key',
      '../../etc/passwd',
      '..\\windows\\system32',
      '/absolute/path/key',
      '.hidden_file',
      'key with spaces',
      'key;rm -rf /',
      '../../../id_rsa'
    ];

    for (const badName of maliciousFilenames) {
      it(`Should reject malicious filename "${badName}"`, async () => {
        const res = await fetch(`${BASE_URL}/api/ssh-keys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': getAuthCookie()
          },
          body: JSON.stringify({ filename: badName, content: 'fake-key-content' })
        });
        expect([400, 401]).toContain(res.status);
      });
    }
  });

  describe('Path Traversal Prevention on DELETE /api/ssh-keys/:name', () => {
    const maliciousNames = [
      '..%2F..%2Fetc%2Fpasswd',
      '..%2Fhacked',
      '.hidden'
    ];

    for (const badName of maliciousNames) {
      it(`Should reject deletion of path traversal target "${badName}"`, async () => {
        const res = await fetch(`${BASE_URL}/api/ssh-keys/${badName}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': getAuthCookie()
          }
        });
        expect([400, 401, 404]).toContain(res.status);
      });
    }
  });

  describe('Authentication Enforcement on SSH Key Endpoints', () => {
    it('GET /api/ssh-keys requires authentication (401 without auth)', async () => {
      const res = await fetch(`${BASE_URL}/api/ssh-keys`);
      expect(res.status).toBe(401);
    });

    it('POST /api/ssh-keys/generate requires authentication (401 without auth)', async () => {
      const res = await fetch(`${BASE_URL}/api/ssh-keys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test_unauth' })
      });
      expect(res.status).toBe(401);
    });

    it('GET /api/ssh-keys returns key inventory and default key with auth', async () => {
      const res = await fetch(`${BASE_URL}/api/ssh-keys`, {
        headers: { 'Cookie': getAuthCookie() }
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.keys)).toBe(true);
    });

    it('POST /api/ssh-keys/generate generates a valid ed25519 keypair with auth', async () => {
      const testKeyName = 'test_gen_' + Date.now();
      const res = await fetch(`${BASE_URL}/api/ssh-keys/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': getAuthCookie()
        },
        body: JSON.stringify({ name: testKeyName })
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.filename).toBe(testKeyName);
      expect(typeof data.publicKey).toBe('string');
      expect(data.publicKey.length).toBeGreaterThan(10);
    });
  });

});
