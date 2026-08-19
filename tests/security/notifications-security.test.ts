import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE_URL = process.env.TEST_BASE_URL || 'https://localhost:3000';

function getAuthCookie(): string {
  loadJsonFile();
  const secret = environment.settings?.jwt_secret || environment.jwt_globals.secret;
  const token = jwt.sign({ userId: 'admin' }, secret);
  return `token=${token}`;
}

describe('Notifications & Discord Webhook Security Tests', () => {

  describe('Unauthenticated Access Protection', () => {
    it('GET /api/notifications/settings should reject unauthorized access', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/settings`);
      expect(res.status).toBe(401);
    });

    it('PUT /api/notifications/settings should reject unauthorized access', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_enabled: true })
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/notifications/test-webhook should reject unauthorized access', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/test-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: 'https://discord.com/api/webhooks/test' })
      });
      expect(res.status).toBe(401);
    });

    it('GET /api/notifications/rules should reject unauthorized access', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/rules`);
      expect(res.status).toBe(401);
    });

    it('POST /api/notifications/rules should reject unauthorized access', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Rule', triggerType: 'status' })
      });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/notifications/rules should reject unauthorized access', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/rules?id=rule-123`, {
        method: 'DELETE'
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Notification Rules Management & Validation', () => {
    let createdRuleId: string;

    it('POST /api/notifications/rules creates a new alert rule with validation', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': getAuthCookie()
        },
        body: JSON.stringify({
          name: 'Database High CPU Alert',
          targetType: 'all_machines',
          triggerType: 'usage',
          metricType: 'cpu',
          thresholdPercent: 85,
          cooldownMinutes: 10
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.rule).toBeDefined();
      expect(data.rule.name).toBe('Database High CPU Alert');
      expect(data.rule.thresholdPercent).toBe(85);
      createdRuleId = data.rule.id;
    });

    it('GET /api/notifications/rules returns rules list including created rule', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/rules`, {
        headers: {
          'Cookie': getAuthCookie()
        }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.rules)).toBe(true);
      const found = data.rules.find((r: any) => r.id === createdRuleId);
      expect(found).toBeDefined();
    });

    it('DELETE /api/notifications/rules removes the created rule', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/rules?id=${createdRuleId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': getAuthCookie()
        }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      const found = data.rules.find((r: any) => r.id === createdRuleId);
      expect(found).toBeUndefined();
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('PUT /api/notifications/settings clamps cooldown minutes and processes rules', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': getAuthCookie()
        },
        body: JSON.stringify({
          cooldown_minutes: 5000, // Clamped to 1440
          rules: [
            {
              name: 'Sanitized Rule',
              targetType: 'machine',
              triggerType: 'usage',
              thresholdPercent: 999 // Clamped to 100
            }
          ]
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.notifications.cooldown_minutes).toBe(1440);
      expect(body.notifications.rules[0].thresholdPercent).toBe(100);
    });

    it('POST /api/notifications/test-webhook should fail safely on invalid or non-resolving URL', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/test-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': getAuthCookie()
        },
        body: JSON.stringify({
          webhookUrl: 'https://invalid-webhook-domain-does-not-exist-xyz.com/hook'
        })
      });

      expect([400, 500]).toContain(res.status);
    });

    it('Rejects non-HTTP URLs for webhooks without crashing', async () => {
      const res = await fetch(`${BASE_URL}/api/notifications/test-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': getAuthCookie()
        },
        body: JSON.stringify({
          webhookUrl: 'file:///etc/passwd'
        })
      });

      expect(res.status).toBe(400);
    });
  });
});
