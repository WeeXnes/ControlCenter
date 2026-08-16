import { environment, type InfrastructureDevice } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';
import { isIpInCidr } from '~/server/util/cidrMatcher';
import { daemonManager } from '~/server/util/daemonManager';
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

  // GET: Compute full topology graph nodes and links
  if (method === 'GET') {
    const machines = (environment.settings.machines || []).map((m) => {
      const isOnline = daemonManager.isOnline(m.id);
      const telemetry = daemonManager.getTelemetry(m.id);
      const services = infra.nodeServices[m.id] || [];

      return {
        id: m.id,
        name: m.name,
        ip: m.ip,
        type: 'machine' as const,
        status: m.status || 'approved',
        online: isOnline,
        telemetry: {
          os: telemetry?.os || '',
          cpuUsagePercent: telemetry?.cpuUsagePercent ?? 0,
          ramUsagePercent: telemetry?.ramUsagePercent ?? 0,
          uptimeSeconds: telemetry?.uptimeSeconds ?? 0
        },
        services
      };
    });

    const devices = (infra.devices || []).map((d) => ({
      ...d,
      services: infra.nodeServices[d.id] || d.services || []
    }));

    // Compute automatic links:
    // 1. Connect machines to matching Router/Subnet CIDR devices
    // 2. Connect services to their parent node
    // 3. Include custom defined links
    const links: Array<{ source: string; target: string; type: 'cidr' | 'service' | 'custom'; label?: string }> = [];

    // CIDR Links
    for (const machine of machines) {
      let matchedDevice = false;
      for (const dev of devices) {
        if (dev.cidr && machine.ip && isIpInCidr(machine.ip, dev.cidr)) {
          links.push({
            source: dev.id,
            target: machine.id,
            type: 'cidr',
            label: dev.cidr
          });
          matchedDevice = true;
        }
      }
    }

    // Service Links
    for (const [nodeId, sList] of Object.entries(infra.nodeServices)) {
      for (const s of sList) {
        links.push({
          source: nodeId,
          target: `service_${s.id}`,
          type: 'service',
          label: `${s.protocol.toUpperCase()}:${s.port}`
        });
      }
    }

    // Custom links
    if (Array.isArray(infra.customLinks)) {
      for (const cl of infra.customLinks) {
        links.push({
          source: cl.source,
          target: cl.target,
          type: 'custom',
          label: cl.label
        });
      }
    }

    return {
      machines,
      devices,
      nodeServices: infra.nodeServices,
      links,
      nodePositions: infra.nodePositions || {}
    };
  }

  // POST: Add or update an infrastructure device
  if (method === 'POST') {
    const body = await readBody(event);
    const { id, name, type, ip, cidr, description, icon } = body;

    if (!name || !type) {
      throw createError({ statusCode: 400, statusMessage: 'Device name and type are required.' });
    }

    const deviceId = id || randomUUID();
    const existingIndex = infra.devices.findIndex((d) => d.id === deviceId);

    const deviceObj: InfrastructureDevice = {
      id: deviceId,
      name: String(name).trim(),
      type: type || 'router',
      ip: ip ? String(ip).trim() : undefined,
      cidr: cidr ? String(cidr).trim() : undefined,
      description: description ? String(description).trim() : undefined,
      icon: icon || undefined
    };

    if (existingIndex !== -1) {
      infra.devices[existingIndex] = {
        ...infra.devices[existingIndex],
        ...deviceObj
      };
    } else {
      infra.devices.push(deviceObj);
    }

    saveJsonFile();
    return { success: true, device: deviceObj };
  }

  // PUT: Update node positions or custom links
  if (method === 'PUT') {
    const body = await readBody(event);
    if (body.nodePositions) {
      infra.nodePositions = { ...infra.nodePositions, ...body.nodePositions };
    }
    if (body.customLinks) {
      infra.customLinks = body.customLinks;
    }
    saveJsonFile();
    return { success: true };
  }

  // DELETE: Remove an infrastructure device
  if (method === 'DELETE') {
    const query = getQuery(event);
    const id = (query.id || (await readBody(event).catch(() => ({})))?.id) as string;

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Missing device id.' });
    }

    infra.devices = infra.devices.filter((d) => d.id !== id);
    delete infra.nodeServices[id];
    if (infra.nodePositions) {
      delete infra.nodePositions[id];
    }
    if (infra.customLinks) {
      infra.customLinks = infra.customLinks.filter((l) => l.source !== id && l.target !== id);
    }

    saveJsonFile();
    return { success: true, message: 'Device removed successfully.' };
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
