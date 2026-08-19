import { environment, type NotificationRule } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';
import { randomBytes } from 'crypto';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  if (!environment.settings.notifications) {
    environment.settings.notifications = { rules: [] };
  }
  if (!Array.isArray(environment.settings.notifications.rules)) {
    environment.settings.notifications.rules = [];
  }

  const rules = environment.settings.notifications.rules;

  if (method === 'GET') {
    return { rules };
  }

  if (method === 'POST') {
    const body = await readBody(event);
    if (!body.name || !body.triggerType) {
      throw createError({ statusCode: 400, statusMessage: 'Rule name and triggerType are required.' });
    }

    const ruleId = body.id || randomBytes(8).toString('hex');
    const existingIndex = rules.findIndex(r => r.id === ruleId);

    const newRule: NotificationRule = {
      id: ruleId,
      name: String(body.name).trim(),
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
      targetType: ['all_machines', 'machine', 'all_services', 'service'].includes(body.targetType) ? body.targetType : 'all_machines',
      targetId: body.targetId ? String(body.targetId).trim() : undefined,
      targetName: body.targetName ? String(body.targetName).trim() : undefined,
      triggerType: ['status', 'usage'].includes(body.triggerType) ? body.triggerType : 'status',
      statusCondition: ['both', 'offline_only', 'online_only'].includes(body.statusCondition) ? body.statusCondition : 'both',
      metricType: ['cpu', 'ram', 'disk'].includes(body.metricType) ? body.metricType : 'cpu',
      thresholdPercent: body.thresholdPercent !== undefined ? Math.max(1, Math.min(100, Number(body.thresholdPercent))) : 80,
      customWebhookUrl: body.customWebhookUrl ? String(body.customWebhookUrl).trim() : undefined,
      cooldownMinutes: body.cooldownMinutes !== undefined ? Math.max(1, Math.min(1440, Number(body.cooldownMinutes))) : undefined,
      createdAt: existingIndex !== -1 ? rules[existingIndex].createdAt : new Date().toISOString()
    };

    if (existingIndex !== -1) {
      rules[existingIndex] = newRule;
    } else {
      rules.push(newRule);
    }

    saveJsonFile();
    return { success: true, message: 'Notification rule saved successfully', rule: newRule, rules };
  }

  if (method === 'DELETE') {
    const query = getQuery(event);
    const id = query.id as string;
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Rule ID is required.' });
    }

    const beforeLength = rules.length;
    environment.settings.notifications.rules = rules.filter(r => r.id !== id);

    if (environment.settings.notifications.rules.length === beforeLength) {
      throw createError({ statusCode: 404, statusMessage: 'Notification rule not found.' });
    }

    saveJsonFile();
    return { success: true, message: 'Notification rule deleted successfully', rules: environment.settings.notifications.rules };
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
