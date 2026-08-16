import { describe, it, expect } from 'vitest';
import { isIpInCidr, ipv4ToNumber } from '../../server/util/cidrMatcher';

const BASE_URL = 'http://localhost:3000';

describe('Infrastructure API Security - Unauthenticated Access Blocked', () => {

  it('GET /api/infrastructure → 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/infrastructure`);
    expect(res.status).toBe(401);
  });

  it('POST /api/infrastructure → 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/infrastructure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Router', type: 'router' }),
    });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/infrastructure → 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/infrastructure?id=test-id`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/infrastructure/services → 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/infrastructure/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: 'test', name: 'Web', port: 80 }),
    });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/infrastructure/services → 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/infrastructure/services?nodeId=test&serviceId=s1`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/infrastructure/probe → 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/infrastructure/probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: '127.0.0.1', port: 22 }),
    });
    expect(res.status).toBe(401);
  });
});

describe('CIDR Subnet Matcher Logic Unit Tests', () => {
  it('correctly parses IPv4 integers', () => {
    expect(ipv4ToNumber('0.0.0.0')).toBe(0);
    expect(ipv4ToNumber('255.255.255.255')).toBe(4294967295);
    expect(ipv4ToNumber('192.168.1.1')).toBe(3232235777);
    expect(ipv4ToNumber('invalid.ip')).toBeNull();
  });

  it('matches /24 subnet', () => {
    expect(isIpInCidr('192.168.178.95', '192.168.178.0/24')).toBe(true);
    expect(isIpInCidr('192.168.178.1', '192.168.178.0/24')).toBe(true);
    expect(isIpInCidr('192.168.179.95', '192.168.178.0/24')).toBe(false);
  });

  it('matches /16 subnet', () => {
    expect(isIpInCidr('100.64.0.1', '100.64.0.0/16')).toBe(true);
    expect(isIpInCidr('100.64.254.80', '100.64.0.0/16')).toBe(true);
    expect(isIpInCidr('100.65.1.1', '100.64.0.0/16')).toBe(false);
  });

  it('matches exact IP without slash', () => {
    expect(isIpInCidr('192.168.1.50', '192.168.1.50')).toBe(true);
    expect(isIpInCidr('192.168.1.51', '192.168.1.50')).toBe(false);
  });

  it('matches comma-separated subnets', () => {
    expect(isIpInCidr('10.0.0.5', '192.168.1.0/24, 10.0.0.0/8')).toBe(true);
    expect(isIpInCidr('172.16.0.1', '192.168.1.0/24, 10.0.0.0/8')).toBe(false);
  });
});
