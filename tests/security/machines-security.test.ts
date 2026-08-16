import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';
const MACHINE_ID = '495f5683-1b75-467f-b2d9-bab73f2e60a6';

describe('Machine API Security - Unauthenticated Access Blocked', () => {

  it('GET /api/machines → 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/machines`);
    expect(res.status).toBe(401);
  });

  it('POST /api/machines → 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/machines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Machine', ip: '10.0.0.1' }),
    });
    expect(res.status).toBe(401);
  });

  it(`GET /api/machines/${MACHINE_ID} → 401 without auth`, async () => {
    const res = await fetch(`${BASE_URL}/api/machines/${MACHINE_ID}`);
    expect(res.status).toBe(401);
  });

  it(`PUT /api/machines/${MACHINE_ID} → 401 without auth`, async () => {
    const res = await fetch(`${BASE_URL}/api/machines/${MACHINE_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Name' }),
    });
    expect(res.status).toBe(401);
  });

  it(`PUT /api/machines/reorder → 401 without auth`, async () => {
    const res = await fetch(`${BASE_URL}/api/machines/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineIds: [MACHINE_ID] }),
    });
    expect(res.status).toBe(401);
  });

  it(`DELETE /api/machines/${MACHINE_ID} → 401 without auth (must not delete machine)`, async () => {
    const res = await fetch(`${BASE_URL}/api/machines/${MACHINE_ID}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it(`GET /api/machines/${MACHINE_ID}/stats → 401 without auth`, async () => {
    const res = await fetch(`${BASE_URL}/api/machines/${MACHINE_ID}/stats`);
    expect(res.status).toBe(401);
  });

  it(`POST /api/machines/${MACHINE_ID}/action → 401 without auth`, async () => {
    const res = await fetch(`${BASE_URL}/api/machines/${MACHINE_ID}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'shutdown' }),
    });
    expect(res.status).toBe(401);
  });

  it(`POST /api/machines/${MACHINE_ID}/approve → 401 without auth`, async () => {
    const res = await fetch(`${BASE_URL}/api/machines/${MACHINE_ID}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });
});

describe('Machine API Security - Invalid Token Rejected', () => {
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJoYWNrZXIifQ.fake';

  it('GET /api/machines with forged JWT → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/machines`, {
      headers: { 'Authorization': `Bearer ${fakeToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('PUT /api/machines/reorder with forged JWT → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/machines/reorder`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${fakeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ machineIds: [MACHINE_ID] }),
    });
    expect(res.status).toBe(401);
  });

  it(`GET /api/machines/${MACHINE_ID}/stats with forged JWT → 401`, async () => {
    const res = await fetch(`${BASE_URL}/api/machines/${MACHINE_ID}/stats`, {
      headers: { 'Authorization': `Bearer ${fakeToken}` },
    });
    expect(res.status).toBe(401);
  });

  it(`POST /api/machines/${MACHINE_ID}/action with forged JWT → 401`, async () => {
    const res = await fetch(`${BASE_URL}/api/machines/${MACHINE_ID}/action`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fakeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'restart' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('Machine API Security - Machine Action Validation', () => {

  it('POST /api/machines/${MACHINE_ID}/action without auth should be 401 regardless of action', async () => {
    // Try every possible dangerous action without auth
    for (const action of ['restart', 'shutdown', 'rm -rf /', 'cat /etc/shadow', '']) {
      const res = await fetch(`${BASE_URL}/api/machines/${MACHINE_ID}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      expect(res.status).toBe(401);
    }
  });
});

describe('Machine API Security - Nonexistent Machine with Invalid Auth', () => {

  it('Accessing nonexistent machine ID without auth → 401 (not 404)', async () => {
    // Must return 401, not 404 — auth check must come before resource lookup
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/api/machines/${fakeId}`);
    expect(res.status).toBe(401);
  });

  it('Accessing nonexistent machine stats without auth → 401 (not 404)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/api/machines/${fakeId}/stats`);
    expect(res.status).toBe(401);
  });

  it('Executing action on nonexistent machine without auth → 401 (not 404)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/api/machines/${fakeId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'shutdown' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('Machine API Security - Cookie-based Token Injection Attempts', () => {

  it('Forged cookie token → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/machines`, {
      headers: {
        'Cookie': 'token=forged.malicious.token',
      },
    });
    expect(res.status).toBe(401);
  });

  it('Empty cookie token → 401', async () => {
    const res = await fetch(`${BASE_URL}/api/machines`, {
      headers: {
        'Cookie': 'token=',
      },
    });
    expect(res.status).toBe(401);
  });
});
