import { environment, type InfrastructureDevice } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';
import { daemonManager } from '~/server/util/daemonManager';
import { isIpInCidr } from '~/server/util/cidrMatcher';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  // Ensure infrastructure configuration structure exists
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

      // Gather all known IP addresses from machine config and live telemetry
      const ipList = Array.from(
        new Set([
          ...(m.ip ? m.ip.split(',').map((s) => s.trim()) : []),
          ...(telemetry?.ipAddresses || [])
        ])
      ).filter(Boolean);

      return {
        id: m.id,
        name: m.name,
        ip: m.ip || (ipList.length > 0 ? ipList[0] : ''),
        ipAddresses: ipList,
        type: 'machine' as const,
        status: m.status || 'approved',
        online: isOnline,
        telemetry: {
          os: telemetry?.os || '',
          cpuUsagePercent: telemetry?.cpuUsagePercent ?? 0,
          ramUsagePercent: telemetry?.ramUsagePercent ?? 0,
          uptimeSeconds: telemetry?.uptimeSeconds ?? 0,
          ipAddresses: ipList
        },
        services
      };
    });

    const devices = (infra.devices || []).map((d) => ({
      ...d,
      services: infra.nodeServices[d.id] || d.services || []
    }));

    // Compute automatic multi-homed links:
    // 1. Connect machines to ALL matching Router/Subnet CIDR devices based on all their IPs
    // 2. Connect sub-devices (e.g. switches/routers) to matching upstream subnets
    // 3. Connect services to their parent node
    // 4. Include custom defined links
    const links: Array<{ source: string; target: string; type: 'cidr' | 'service' | 'custom'; label?: string }> = [];

    // Multi-IP CIDR matching for machines
    for (const machine of machines) {
      const machineIps = machine.ipAddresses && machine.ipAddresses.length > 0
        ? machine.ipAddresses
        : (machine.ip ? [machine.ip] : []);

      for (const dev of devices) {
        if (!dev.cidr) continue;

        // Check if ANY of the machine's IPs matches this device's subnet CIDR
        const matchingIp = machineIps.find((ip) => isIpInCidr(ip, dev.cidr));
        if (matchingIp) {
          links.push({
            source: dev.id,
            target: machine.id,
            type: 'cidr',
            label: dev.cidr
          });
        }
      }
    }

    // Inter-device CIDR matching (e.g. switch or nested router connected to parent subnet)
    for (const dev of devices) {
      if (!dev.ip) continue;
      for (const parentDev of devices) {
        if (parentDev.id === dev.id || !parentDev.cidr) continue;
        if (isIpInCidr(dev.ip, parentDev.cidr)) {
          // Avoid duplicate reciprocal links
          const alreadyLinked = links.some(
            (l) => (l.source === dev.id && l.target === parentDev.id) || (l.source === parentDev.id && l.target === dev.id)
          );
          if (!alreadyLinked) {
            links.push({
              source: parentDev.id,
              target: dev.id,
              type: 'cidr',
              label: parentDev.cidr
            });
          }
        }
      }
    }

    // Service Links (attached to machines or devices)
    for (const [nodeId, sList] of Object.entries(infra.nodeServices)) {
      for (const s of sList) {
        links.push({
          source: nodeId,
          target: `service_${s.id}`,
          type: 'service'
        });
      }
    }

    // Custom links
    if (Array.isArray(infra.customLinks)) {
      for (const cl of infra.customLinks) {
        if (cl.source && cl.target) {
          links.push({
            source: cl.source,
            target: cl.target,
            type: 'custom',
            label: cl.label
          });
        }
      }
    }

    return {
      machines,
      devices,
      nodeServices: infra.nodeServices,
      links,
      positions: infra.nodePositions || {}
    };
  }

  // POST: Create a new custom infrastructure device
  if (method === 'POST') {
    const body = await readBody(event);
    const { name, type, ip, cidr, description, icon } = body;

    if (!name || !type) {
      throw createError({ statusCode: 400, statusMessage: 'Name and type are required.' });
    }

    const newDevice: InfrastructureDevice = {
      id: randomUUID(),
      name: String(name).trim(),
      type: type || 'router',
      ip: ip ? String(ip).trim() : undefined,
      cidr: cidr ? String(cidr).trim() : undefined,
      description: description ? String(description).trim() : undefined,
      icon: icon || undefined
    };

    if (!infra.devices) {
      infra.devices = [];
    }

    infra.devices.push(newDevice);
    saveJsonFile();

    return { success: true, device: newDevice };
  }

  // PUT: Update an existing custom device
  if (method === 'PUT') {
    const body = await readBody(event);
    const { id, name, type, ip, cidr, description, icon } = body;

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Device ID is required for update.' });
    }

    const device = infra.devices.find((d) => d.id === id);
    if (!device) {
      throw createError({ statusCode: 404, statusMessage: 'Device not found.' });
    }

    if (name) device.name = String(name).trim();
    if (type) device.type = type;
    if (ip !== undefined) device.ip = ip ? String(ip).trim() : undefined;
    if (cidr !== undefined) device.cidr = cidr ? String(cidr).trim() : undefined;
    if (description !== undefined) device.description = description ? String(description).trim() : undefined;
    if (icon !== undefined) device.icon = icon || undefined;

    saveJsonFile();
    return { success: true, device };
  }

  // DELETE: Remove a custom infrastructure device
  if (method === 'DELETE') {
    const query = getQuery(event);
    const body = await readBody(event).catch(() => ({}));
    const id = (query.id || body.id) as string;

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Device ID is required.' });
    }

    infra.devices = (infra.devices || []).filter((d) => d.id !== id);

    // Clean up any attached services
    if (infra.nodeServices[id]) {
      delete infra.nodeServices[id];
    }

    // Clean up any custom links referencing this device
    if (Array.isArray(infra.customLinks)) {
      infra.customLinks = infra.customLinks.filter((l) => l.source !== id && l.target !== id);
    }

    saveJsonFile();
    return { success: true, message: 'Device removed successfully.' };
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
