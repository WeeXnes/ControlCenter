import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const otplib = require('otplib');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE_URL = process.env.TEST_BASE_URL || 'https://localhost:3000';

describe('2FA Security - Endpoint Access Control', () => {

  it('GET /api/2fa/setup without auth token should return 401', async () => {
    const res = await fetch(`${BASE_URL}/api/2fa/setup`);
    expect(res.status).toBe(401);
  });

  it('POST /api/2fa/enable without auth token should return 401', async () => {
    const res = await fetch(`${BASE_URL}/api/2fa/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'JBSWY3DPEHPK3PXP', code: '123456' })
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/2fa/disable without auth token should return 401', async () => {
    const res = await fetch(`${BASE_URL}/api/2fa/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '123456' })
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/change-password without auth token should return 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'test', newPassword: 'newpassword123' })
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/2fa/verify-login should be public (returns 400 when missing parameters, not 401)', async () => {
    const res = await fetch(`${BASE_URL}/api/2fa/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });
});

describe('2FA Security - Partial Token Segregation', () => {

  it('Partial 2FA token (isPartial: true) must be rejected on protected API endpoints', async () => {
    const partialToken = jwt.sign(
      { userId: 'admin', isPartial: true },
      'test-or-fallback-secret',
      { expiresIn: '5m' }
    );

    const protectedRoutes = [
      '/api/machines',
      '/api/ssh-keys',
      '/api/2fa/setup',
      '/api/2fa/enable',
      '/api/2fa/disable',
      '/api/auth/change-password'
    ];

    for (const route of protectedRoutes) {
      const res = await fetch(`${BASE_URL}${route}`, {
        headers: {
          'Authorization': `Bearer ${partialToken}`,
          'Content-Type': 'application/json'
        }
      });
      expect(res.status).toBe(401);
    }
  });

  it('POST /api/2fa/verify-login should reject regular non-partial tokens', async () => {
    const fullToken = jwt.sign(
      { userId: 'admin' },
      'test-or-fallback-secret',
      { expiresIn: '30d' }
    );

    const res = await fetch(`${BASE_URL}/api/2fa/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tempToken: fullToken,
        code: '123456'
      })
    });

    expect([400, 401]).toContain(res.status);
  });
});

describe('2FA Security - Code Validation & Protection', () => {

  it('POST /api/2fa/verify-login with garbage token should return 401', async () => {
    const res = await fetch(`${BASE_URL}/api/2fa/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tempToken: 'invalid.temp.token',
        code: '123456'
      })
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/status includes twoFactorEnabled boolean flag', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('twoFactorEnabled');
    expect(typeof data.twoFactorEnabled).toBe('boolean');
  });

  it('otplib verify accurately validates live generated TOTP tokens', async () => {
    const secret = otplib.generateSecret();
    const token = otplib.generateSync({ secret });
    const verifyRes = await otplib.verify({ token, secret, epochTolerance: 60 });
    expect(verifyRes.valid).toBe(true);

    const invalidRes = await otplib.verify({ token: '000000', secret, epochTolerance: 60 });
    expect(invalidRes.valid).toBe(false);
  });
});
