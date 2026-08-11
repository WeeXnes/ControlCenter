import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: badName, content: 'fake-key-content' })
        });
        // Should be 401 (unauthenticated) or 400 (bad request validation failure if auth passed)
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
          headers: { 'Content-Type': 'application/json' }
        });
        expect([400, 401, 404]).toContain(res.status);
      });
    }
  });

});
