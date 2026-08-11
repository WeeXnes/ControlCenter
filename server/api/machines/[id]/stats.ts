import { environment } from '~/core/globals';
import { saveJsonFile, loadJsonFile } from '~/util/jsonLoader';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const machine = environment.settings.machines.find(m => m.id === id);
  if (!machine) {
    throw createError({ statusCode: 404, statusMessage: 'Machine not found' });
  }

  const daemonUrl = `http://${machine.ip}:${machine.daemonPort || 9100}/api/v1/telemetry`;

  try {
    const headers: Record<string, string> = {};
    if (machine.apiKey) {
      headers['X-API-Key'] = machine.apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(daemonUrl, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      machine.lastSeen = new Date().toISOString();
      saveJsonFile();

      return {
        online: true,
        machineId: machine.id,
        hostname: data.hostname || machine.name,
        os: data.os || 'Unknown OS',
        cpuModel: data.cpuModel || 'Generic CPU',
        cpuCores: data.cpuCores || 1,
        cpuUsagePercent: data.cpuUsagePercent ?? 0,
        ramTotalBytes: data.ramTotalBytes ?? 0,
        ramUsedBytes: data.ramUsedBytes ?? 0,
        ramUsagePercent: data.ramUsagePercent ?? 0,
        diskTotalBytes: data.diskTotalBytes ?? 0,
        diskUsedBytes: data.diskUsedBytes ?? 0,
        diskUsagePercent: data.diskUsagePercent ?? 0,
        uptimeSeconds: data.uptimeSeconds ?? 0,
        ipAddresses: data.ipAddresses || [machine.ip],
        timestamp: new Date().toISOString()
      };
    }
  } catch (err: any) {
    // Daemon call failed or timed out
  }

  return {
    online: false,
    machineId: machine.id,
    hostname: machine.name,
    ipAddresses: [machine.ip],
    cpuUsagePercent: 0,
    ramUsagePercent: 0,
    diskUsagePercent: 0,
    message: 'Machine daemon unreachable'
  };
});
