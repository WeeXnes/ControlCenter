import { environment, type NotificationRule } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedOptions {
  title: string;
  description?: string;
  color: number; // Decimal color e.g. 0xEF4444 (Red), 0x10B981 (Green), 0xF59E0B (Amber), 0x6366F1 (Indigo)
  fields?: DiscordEmbedField[];
  url?: string;
  footerText?: string;
}

// In-memory cooldown tracker: key -> timestamp (ms)
const cooldownMap = new Map<string, number>();

function isCooldownActive(key: string, cooldownMinutes: number = 5): boolean {
  const lastTime = cooldownMap.get(key);
  if (!lastTime) return false;
  const now = Date.now();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  return (now - lastTime) < cooldownMs;
}

function setCooldown(key: string) {
  cooldownMap.set(key, Date.now());
}

export async function sendDiscordEmbed(options: DiscordEmbedOptions, customWebhookUrl?: string): Promise<boolean> {
  try {
    if (!environment.settings || !environment.settings.jwt_secret) {
      loadJsonFile();
    }

    const webhookUrl = customWebhookUrl || environment.settings?.notifications?.discord_webhook_url;
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
      return false;
    }

    // Only require discord_enabled if using global webhook URL (manual tests or custom URL pass explicitly)
    if (!customWebhookUrl && !environment.settings?.notifications?.discord_enabled) {
      return false;
    }

    const payload = {
      username: 'ControlCenter Monitoring',
      avatar_url: 'https://raw.githubusercontent.com/iconify/icon-sets/master/json/material-symbols.json',
      embeds: [
        {
          title: options.title,
          description: options.description || '',
          color: options.color,
          fields: options.fields || [],
          timestamp: new Date().toISOString(),
          footer: {
            text: options.footerText || 'ControlCenter Infrastructure Cockpit'
          }
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (err: any) {
    console.error('[DiscordNotifier] Failed to send Discord webhook:', err?.message || err);
    return false;
  }
}

export async function notifyMachineStateChange(
  machine: { id: string; name: string; ip: string },
  online: boolean
) {
  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const notif = environment.settings?.notifications;
  const globalWebhook = notif?.discord_webhook_url;
  const globalEnabled = notif?.discord_enabled ?? false;
  const rules = notif?.rules || [];

  // Match rules that target this machine or all machines for status trigger
  const matchingRules = rules.filter(r => {
    if (!r.enabled) return false;
    if (r.triggerType !== 'status') return false;
    const targetMatch = r.targetType === 'all_machines' || (r.targetType === 'machine' && r.targetId === machine.id);
    if (!targetMatch) return false;

    const condition = r.statusCondition || 'both';
    if (condition === 'both') return true;
    if (online && condition === 'online_only') return true;
    if (!online && condition === 'offline_only') return true;
    return false;
  });

  // If no rules exist but global webhook is enabled and configured, fallback to default behavior
  if (matchingRules.length === 0 && rules.length === 0 && globalEnabled && globalWebhook) {
    const key = `machine_state:${machine.id}:${online ? 'online' : 'offline'}`;
    const cooldownMins = notif?.cooldown_minutes ?? 2;
    if (isCooldownActive(key, cooldownMins)) return;
    setCooldown(key);

    const title = online
      ? `🟢 [Node Online] ${machine.name} Connected`
      : `🔴 [Node Offline] ${machine.name} Disconnected`;

    const description = online
      ? `Machine **${machine.name}** is now online and actively streaming telemetry.`
      : `Machine **${machine.name}** went offline or lost reverse connection.`;

    const color = online ? 0x10B981 : 0xEF4444;

    await sendDiscordEmbed({
      title,
      description,
      color,
      fields: [
        { name: 'Machine Name', value: machine.name, inline: true },
        { name: 'IP Address', value: machine.ip || 'Unknown', inline: true },
        { name: 'Status', value: online ? 'Online (WSS)' : 'Offline', inline: true }
      ]
    });
    return;
  }

  // Execute matching rules
  for (const rule of matchingRules) {
    const targetWebhook = rule.customWebhookUrl || globalWebhook;
    if (!targetWebhook) continue;

    const key = `rule:${rule.id}:${machine.id}:${online ? 'online' : 'offline'}`;
    const cooldownMins = rule.cooldownMinutes ?? notif?.cooldown_minutes ?? 2;
    if (isCooldownActive(key, cooldownMins)) continue;
    setCooldown(key);

    const title = online
      ? `🟢 [Rule: ${rule.name}] Node ${machine.name} Connected`
      : `🔴 [Rule: ${rule.name}] Node ${machine.name} Disconnected`;

    const description = online
      ? `Machine **${machine.name}** is now online. (Triggered by Rule: **${rule.name}**)`
      : `Machine **${machine.name}** went offline or lost connection. (Triggered by Rule: **${rule.name}**)`;

    const color = online ? 0x10B981 : 0xEF4444;

    await sendDiscordEmbed(
      {
        title,
        description,
        color,
        fields: [
          { name: 'Machine Name', value: machine.name, inline: true },
          { name: 'IP Address', value: machine.ip || 'Unknown', inline: true },
          { name: 'Status', value: online ? 'Online' : 'Offline', inline: true }
        ],
        footerText: `ControlCenter Alert • Rule: ${rule.name}`
      },
      targetWebhook
    );
  }
}

export async function notifyServiceStateChange(
  service: { id?: string; name: string; port: number; protocol?: string },
  nodeName: string,
  reachable: boolean,
  latencyMs?: number
) {
  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const notif = environment.settings?.notifications;
  const globalWebhook = notif?.discord_webhook_url;
  const globalEnabled = notif?.discord_enabled ?? false;
  const rules = notif?.rules || [];

  // Match rules that target this service or all services for status trigger
  const matchingRules = rules.filter(r => {
    if (!r.enabled) return false;
    if (r.triggerType !== 'status') return false;
    const targetMatch = r.targetType === 'all_services' || (r.targetType === 'service' && r.targetId === service.id);
    if (!targetMatch) return false;

    const condition = r.statusCondition || 'both';
    if (condition === 'both') return true;
    if (reachable && condition === 'online_only') return true;
    if (!reachable && condition === 'offline_only') return true;
    return false;
  });

  // Fallback if no rules exist but global webhook is enabled
  if (matchingRules.length === 0 && rules.length === 0 && globalEnabled && globalWebhook) {
    const key = `service_state:${service.id || service.name}:${service.port}:${reachable ? 'online' : 'offline'}`;
    const cooldownMins = notif?.cooldown_minutes ?? 2;
    if (isCooldownActive(key, cooldownMins)) return;
    setCooldown(key);

    const title = reachable
      ? `🟢 [Service Restored] ${service.name} is Online`
      : `🔴 [Service Downtime] ${service.name} is Offline`;

    const description = reachable
      ? `Monitored service **${service.name}** (Port ${service.port}) on node **${nodeName}** is responding.`
      : `Monitored service **${service.name}** (Port ${service.port}) on node **${nodeName}** failed health check probe.`;

    const color = reachable ? 0x10B981 : 0xEF4444;

    const fields: DiscordEmbedField[] = [
      { name: 'Service Name', value: service.name, inline: true },
      { name: 'Target Port', value: `${service.port} (${service.protocol || 'TCP'})`, inline: true },
      { name: 'Host / Node', value: nodeName, inline: true }
    ];

    if (reachable && latencyMs !== undefined) {
      fields.push({ name: 'Response Time', value: `${latencyMs} ms`, inline: true });
    }

    await sendDiscordEmbed({
      title,
      description,
      color,
      fields
    });
    return;
  }

  // Execute matching rules
  for (const rule of matchingRules) {
    const targetWebhook = rule.customWebhookUrl || globalWebhook;
    if (!targetWebhook) continue;

    const key = `rule:${rule.id}:${service.id || service.name}:${service.port}:${reachable ? 'online' : 'offline'}`;
    const cooldownMins = rule.cooldownMinutes ?? notif?.cooldown_minutes ?? 2;
    if (isCooldownActive(key, cooldownMins)) continue;
    setCooldown(key);

    const title = reachable
      ? `🟢 [Rule: ${rule.name}] Service ${service.name} Online`
      : `🔴 [Rule: ${rule.name}] Service ${service.name} Downtime Alert`;

    const description = reachable
      ? `Monitored service **${service.name}** (Port ${service.port}) on **${nodeName}** is responding.`
      : `Monitored service **${service.name}** (Port ${service.port}) on **${nodeName}** failed health probe!`;

    const color = reachable ? 0x10B981 : 0xEF4444;

    const fields: DiscordEmbedField[] = [
      { name: 'Service Name', value: service.name, inline: true },
      { name: 'Target Port', value: `${service.port} (${service.protocol || 'TCP'})`, inline: true },
      { name: 'Host / Node', value: nodeName, inline: true }
    ];

    if (reachable && latencyMs !== undefined) {
      fields.push({ name: 'Response Time', value: `${latencyMs} ms`, inline: true });
    }

    await sendDiscordEmbed(
      {
        title,
        description,
        color,
        fields,
        footerText: `ControlCenter Alert • Rule: ${rule.name}`
      },
      targetWebhook
    );
  }
}

export async function checkTelemetryRules(
  machine: { id: string; name: string; ip: string },
  telemetry: { cpuUsagePercent?: number; ramUsagePercent?: number; diskUsagePercent?: number }
) {
  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const notif = environment.settings?.notifications;
  const globalWebhook = notif?.discord_webhook_url;
  const rules = notif?.rules || [];

  // Match telemetry usage rules that target this machine or all machines
  const usageRules = rules.filter(r => {
    if (!r.enabled) return false;
    if (r.triggerType !== 'usage') return false;
    const targetMatch = r.targetType === 'all_machines' || (r.targetType === 'machine' && r.targetId === machine.id);
    return targetMatch;
  });

  for (const rule of usageRules) {
    const targetWebhook = rule.customWebhookUrl || globalWebhook;
    if (!targetWebhook) continue;

    const metric = rule.metricType || 'cpu';
    const threshold = rule.thresholdPercent ?? 80;
    let currentVal = 0;

    if (metric === 'cpu') {
      currentVal = telemetry.cpuUsagePercent ?? 0;
    } else if (metric === 'ram') {
      currentVal = telemetry.ramUsagePercent ?? 0;
    } else if (metric === 'disk') {
      currentVal = telemetry.diskUsagePercent ?? 0;
    }

    if (currentVal >= threshold) {
      const key = `rule:${rule.id}:${machine.id}:${metric}`;
      const cooldownMins = rule.cooldownMinutes ?? notif?.cooldown_minutes ?? 5;
      if (isCooldownActive(key, cooldownMins)) continue;
      setCooldown(key);

      const typeName = metric === 'cpu' ? 'CPU Load' : (metric === 'ram' ? 'RAM Memory' : 'Disk Storage');
      const title = `⚠️ [Rule: ${rule.name}] High ${typeName} Alert: ${currentVal.toFixed(1)}%`;
      const description = `Machine **${machine.name}** (${machine.ip}) exceeded the threshold of **${threshold}%** (Current: **${currentVal.toFixed(1)}%**).`;
      const color = 0xF59E0B;

      await sendDiscordEmbed(
        {
          title,
          description,
          color,
          fields: [
            { name: 'Machine', value: machine.name, inline: true },
            { name: 'Resource', value: typeName, inline: true },
            { name: 'Current Usage', value: `${currentVal.toFixed(1)}% (Threshold: ${threshold}%)`, inline: true }
          ],
          footerText: `ControlCenter Alert • Rule: ${rule.name}`
        },
        targetWebhook
      );
    }
  }
}

export async function notifyTelemetryThreshold(
  machine: { id: string; name: string; ip: string },
  type: 'cpu' | 'ram' | 'disk',
  currentVal: number,
  thresholdVal: number,
  detail?: string
) {
  // Legacy / fallback helper
  await checkTelemetryRules(machine, {
    cpuUsagePercent: type === 'cpu' ? currentVal : undefined,
    ramUsagePercent: type === 'ram' ? currentVal : undefined,
    diskUsagePercent: type === 'disk' ? currentVal : undefined
  });
}
