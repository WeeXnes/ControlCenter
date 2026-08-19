import { environment } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';
import { executeProbe } from '~/server/util/probeHelper';
import { notifyServiceStateChange } from '~/server/util/discordNotifier';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const body = await readBody(event);
  const { host, port, protocol, nodeId, serviceId } = body;

  if (!host || !port) {
    throw createError({ statusCode: 400, statusMessage: 'host and port are required.' });
  }

  const targetPort = Number(port);
  if (targetPort < 1 || targetPort > 65535) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid port number.' });
  }

  const result = await executeProbe(String(host), targetPort);

  // Persist probe results in settings storage if serviceId/nodeId are provided
  if (nodeId && serviceId) {
    if (!environment.settings || !environment.settings.jwt_secret) {
      loadJsonFile();
    }

    if (environment.settings.infrastructure?.nodeServices?.[nodeId]) {
      const srv = environment.settings.infrastructure.nodeServices[nodeId].find((s) => s.id === serviceId);
      if (srv) {
        const prevStatus = srv.status;
        const newStatus = result.reachable ? 'online' : 'offline';

        srv.status = newStatus;
        srv.latencyMs = result.latencyMs;
        srv.lastChecked = new Date().toISOString();
        saveJsonFile();

        // If status changed, send Discord alert
        if (prevStatus && prevStatus !== newStatus && prevStatus !== 'unknown' && prevStatus !== 'checking') {
          // Find node name
          const machine = environment.settings.machines.find(m => m.id === nodeId);
          const dev = environment.settings.infrastructure.devices.find(d => d.id === nodeId);
          const nodeName = machine?.name || dev?.name || `Node ${nodeId.substring(0, 8)}`;

          notifyServiceStateChange(
            { id: srv.id, name: srv.name, port: srv.port, protocol: srv.protocol },
            nodeName,
            result.reachable,
            result.latencyMs
          ).catch(() => {});
        }
      }
    }
  }

  return result;
});
