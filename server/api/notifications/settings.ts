import { environment, type NotificationRule, type NotificationSettings } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';
import { randomBytes } from 'crypto';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  if (method === 'GET') {
    return environment.settings.notifications || {
      discord_webhook_url: '',
      discord_enabled: false,
      cooldown_minutes: 5,
      rules: []
    };
  }

  if (method === 'PUT') {
    const body = await readBody(event);
    const existing: NotificationSettings = environment.settings.notifications || { rules: [] };

    let updatedRules = existing.rules || [];
    if (Array.isArray(body.rules)) {
      updatedRules = body.rules.map((r: any) => ({
        id: r.id || randomBytes(8).toString('hex'),
        name: String(r.name || 'Rule').trim(),
        enabled: Boolean(r.enabled ?? true),
        targetType: ['all_machines', 'machine', 'all_services', 'service'].includes(r.targetType) ? r.targetType : 'all_machines',
        targetId: r.targetId ? String(r.targetId).trim() : undefined,
        targetName: r.targetName ? String(r.targetName).trim() : undefined,
        triggerType: ['status', 'usage'].includes(r.triggerType) ? r.triggerType : 'status',
        statusCondition: ['both', 'offline_only', 'online_only'].includes(r.statusCondition) ? r.statusCondition : 'both',
        metricType: ['cpu', 'ram', 'disk'].includes(r.metricType) ? r.metricType : 'cpu',
        thresholdPercent: r.thresholdPercent !== undefined ? Math.max(1, Math.min(100, Number(r.thresholdPercent))) : 80,
        customWebhookUrl: r.customWebhookUrl ? String(r.customWebhookUrl).trim() : undefined,
        cooldownMinutes: r.cooldownMinutes !== undefined ? Math.max(1, Math.min(1440, Number(r.cooldownMinutes))) : undefined,
        createdAt: r.createdAt || new Date().toISOString()
      }));
    }

    environment.settings.notifications = {
      discord_webhook_url: body.discord_webhook_url !== undefined ? String(body.discord_webhook_url).trim() : (existing.discord_webhook_url || ''),
      discord_enabled: body.discord_enabled !== undefined ? Boolean(body.discord_enabled) : (existing.discord_enabled ?? false),
      cooldown_minutes: body.cooldown_minutes !== undefined ? Math.max(1, Math.min(1440, Number(body.cooldown_minutes))) : (existing.cooldown_minutes ?? 5),
      rules: updatedRules
    };

    saveJsonFile();
    return {
      success: true,
      message: 'Notification settings & rules saved successfully',
      notifications: environment.settings.notifications
    };
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
