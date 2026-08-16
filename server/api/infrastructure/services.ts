import { environment, type NodeService } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  if (!environment.settings.infrastructure) {
    environment.settings.infrastructure = {
      devices: [],
      nodeServices: {},
      customLinks: [],
      nodePositions: {}
    };
  }

  const infra = environment.settings.infrastructure;

  // POST: Add or update a service
  if (method === 'POST') {
    const body = await readBody(event);
    const { nodeId, id, name, port, protocol, path } = body;

    if (!nodeId || !name || !port) {
      throw createError({ statusCode: 400, statusMessage: 'nodeId, service name, and port are required.' });
    }

    if (!infra.nodeServices[nodeId]) {
      infra.nodeServices[nodeId] = [];
    }

    const serviceId = id || randomUUID();
    const existingIndex = infra.nodeServices[nodeId].findIndex((s) => s.id === serviceId);

    const serviceObj: NodeService = {
      id: serviceId,
      name: String(name).trim(),
      port: Number(port),
      protocol: protocol || 'http',
      path: path ? String(path).trim() : undefined,
      status: 'unknown'
    };

    if (existingIndex !== -1) {
      infra.nodeServices[nodeId][existingIndex] = {
        ...infra.nodeServices[nodeId][existingIndex],
        ...serviceObj
      };
    } else {
      infra.nodeServices[nodeId].push(serviceObj);
    }

    saveJsonFile();
    return { success: true, service: serviceObj };
  }

  // DELETE: Remove a service
  if (method === 'DELETE') {
    const query = getQuery(event);
    const body = await readBody(event).catch(() => ({}));
    const nodeId = (query.nodeId || body.nodeId) as string;
    const serviceId = (query.serviceId || query.id || body.serviceId || body.id) as string;

    if (!nodeId || !serviceId) {
      throw createError({ statusCode: 400, statusMessage: 'nodeId and serviceId are required.' });
    }

    if (infra.nodeServices[nodeId]) {
      infra.nodeServices[nodeId] = infra.nodeServices[nodeId].filter((s) => s.id !== serviceId);
      saveJsonFile();
    }

    return { success: true, message: 'Service removed successfully.' };
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
