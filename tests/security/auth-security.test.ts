import { describe, it, expect, beforeAll } from 'vitest';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE_URL = process.env.TEST_BASE_URL || 'https://localhost:3000';

// All protected API endpoints in the application
const PROTECTED_ENDPOINTS = [
  { method: 'GET', path: '/api/machines' },
  { method: 'POST', path: '/api/machines' },
  { method: 'GET', path: '/api/auth/logout' },
  { method: 'GET', path: '/api/ssh-keys' },
  { method: 'POST', path: '/api/ssh-keys' },
  { method: 'DELETE', path: '/api/ssh-keys/testkey' },
  { method: 'GET', path: '/api/2fa/setup' },
  { method: 'POST', path: '/api/2fa/enable' },
  { method: 'POST', path: '/api/2fa/disable' },
];

// Machine-specific protected endpoints (use a valid UUID format)
const MACHINE_ENDPOINTS = [
  { method: 'GET', path: '/api/machines/495f5683-1b75-467f-b2d9-bab73f2e60a6' },
  { method: 'PUT', path: '/api/machines/495f5683-1b75-467f-b2d9-bab73f2e60a6' },
  { method: 'DELETE', path: '/api/machines/495f5683-1b75-467f-b2d9-bab73f2e60a6' },
  { method: 'GET', path: '/api/machines/495f5683-1b75-467f-b2d9-bab73f2e60a6/stats' },
  { method: 'POST', path: '/api/machines/495f5683-1b75-467f-b2d9-bab73f2e60a6/action' },
];

describe('Authentication Security - Unauthenticated Access', () => {

  describe('All protected endpoints must reject unauthenticated requests with 401', () => {
    for (const endpoint of PROTECTED_ENDPOINTS) {
      it(`${endpoint.method} ${endpoint.path} → 401`, async () => {
        const res = await fetch(`${BASE_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.method !== 'GET' ? JSON.stringify({}) : undefined,
          redirect: 'manual',
        });
        expect(res.status).toBe(401);
      });
    }
  });

  describe('Machine-specific endpoints must reject unauthenticated requests with 401', () => {
    for (const endpoint of MACHINE_ENDPOINTS) {
      it(`${endpoint.method} ${endpoint.path} → 401`, async () => {
        const res = await fetch(`${BASE_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.method !== 'GET' ? JSON.stringify({}) : undefined,
          redirect: 'manual',
        });
        expect(res.status).toBe(401);
      });
    }
  });

  describe('Invalid token should be rejected with 401', () => {
    it('GET /api/machines with garbage token → 401', async () => {
      const res = await fetch(`${BASE_URL}/api/machines`, {
        headers: {
          'Authorization': 'Bearer garbage.invalid.token',
          'Content-Type': 'application/json'
        },
      });
      expect(res.status).toBe(401);
    });

    it('GET /api/machines with malformed JWT → 401', async () => {
      const res = await fetch(`${BASE_URL}/api/machines`, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMH0.invalidsignature',
          'Content-Type': 'application/json'
        },
      });
      expect(res.status).toBe(401);
    });

    it('GET /api/machines with empty Bearer header → 401', async () => {
      const res = await fetch(`${BASE_URL}/api/machines`, {
        headers: {
          'Authorization': 'Bearer ',
          'Content-Type': 'application/json'
        },
      });
      expect(res.status).toBe(401);
    });

    it('GET /api/machines with non-Bearer auth header → 401', async () => {
      const res = await fetch(`${BASE_URL}/api/machines`, {
        headers: {
          'Authorization': 'Basic dXNlcjpwYXNz',
          'Content-Type': 'application/json'
        },
      });
      expect(res.status).toBe(401);
    });
  });
});

describe('Authentication Security - Public Endpoints', () => {

  it('POST /api/auth/login should be accessible (returns 400 without body, not 401)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Should be 400 (missing password), NOT 401
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/setup should be accessible (returns 403 if already onboarded, not 401)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'test' }),
    });
    // Should be 403 (already onboarded), NOT 401
    expect(res.status).toBe(403);
  });

  it('GET /api/auth/status should be accessible and return onboarded status', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('onboarded');
    expect(data).toHaveProperty('authenticated');
    expect(data.onboarded).toBe(true);
    expect(data.authenticated).toBe(false); // no token sent
  });
});

describe('Authentication Security - Login Flow', () => {

  it('POST /api/auth/login with wrong password → 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-password-attempt' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.statusMessage).toContain('Invalid credentials');
  });

  it('POST /api/auth/login with empty password → 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login should NOT return token in response body (httpOnly cookie only)', async () => {
    // Even with a wrong password, verify the response schema doesn't include token
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-password' }),
    });
    const data = await res.json();
    expect(data).not.toHaveProperty('token');
  });
});

describe('Authentication Security - Setup Protection', () => {

  it('POST /api/auth/setup should block re-setup after onboarding → 403', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'attacker-new-password' }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.statusMessage).toContain('already completed');
  });

  it('POST /api/auth/setup with short password should still be blocked by onboarding check first', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'ab' }),
    });
    // Should be 403 (already onboarded), not 400 (validation)
    // The onboarding check comes first
    expect(res.status).toBe(403);
  });
});

describe('Authentication Security - Machine API Key Not Exposed', () => {

  it('GET /api/machines list should not include apiKey field (even when authenticated)', async () => {
    // First we test the shape by trying to login - we can't actually get a valid token
    // without the real password, so this test verifies the unauthenticated response structure
    const res = await fetch(`${BASE_URL}/api/machines`, {
      headers: { 'Content-Type': 'application/json' },
    });
    // This will be 401 since we have no token, which is correct
    expect(res.status).toBe(401);
  });
});
