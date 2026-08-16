import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';
import { daemonManager } from '~/server/util/daemonManager';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const machine = environment.settings.machines.find(m => m.id === id);
  if (!machine) {
    throw createError({ statusCode: 404, statusMessage: 'Machine not found' });
  }

  const telemetry = daemonManager.getTelemetry(machine.id);
  const isOnline = daemonManager.isOnline(machine.id);

  if (telemetry && (isOnline || telemetry.hostname)) {
    return {
      online: isOnline,
      machineId: machine.id,
      hostname: telemetry.hostname || machine.name,
      os: telemetry.os || 'Unknown OS',
      cpuModel: telemetry.cpuModel || 'Generic CPU',
      cpuCores: telemetry.cpuCores || 1,
      cpuUsagePercent: telemetry.cpuUsagePercent ?? 0,
      ramTotalBytes: telemetry.ramTotalBytes ?? 0,
      ramUsedBytes: telemetry.ramUsedBytes ?? 0,
      ramUsagePercent: telemetry.ramUsagePercent ?? 0,
      diskTotalBytes: telemetry.diskTotalBytes ?? 0,
      diskUsedBytes: telemetry.diskUsedBytes ?? 0,
      diskUsagePercent: telemetry.diskUsagePercent ?? 0,
      uptimeSeconds: telemetry.uptimeSeconds ?? 0,
      ipAddresses: telemetry.ipAddresses || [machine.ip],
      timestamp: telemetry.timestamp || new Date().toISOString(),
      lastSeen: machine.lastSeen || telemetry.lastSeen
    };
  }

  return {
    online: false,
    machineId: machine.id,
    hostname: machine.name,
    ipAddresses: [machine.ip],
    cpuUsagePercent: 0,
    ramUsagePercent: 0,
    diskUsagePercent: 0,
    message: 'Machine daemon offline (awaiting reverse connection)'
  };
});

