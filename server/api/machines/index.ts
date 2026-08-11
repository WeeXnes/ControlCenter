import { environment, type Machine } from '~/core/globals';
import { saveJsonFile, loadJsonFile } from '~/util/jsonLoader';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  if (method === 'GET') {
    return environment.settings.machines.map(m => ({
      id: m.id,
      name: m.name,
      ip: m.ip,
      daemonPort: m.daemonPort || 9100,
      sshPort: m.sshPort || 22,
      sshUser: m.sshUser || 'root',
      sshAuthType: m.sshAuthType || 'password',
      sshKeyFile: m.sshKeyFile || '',
      addedAt: m.addedAt,
      lastSeen: m.lastSeen
    }));
  }

  if (method === 'POST') {
    const body = await readBody(event);
    const { name, ip, daemonPort, apiKey, sshPort, sshUser, sshAuthType, sshPassword, sshKeyFile, sshPrivateKey } = body;

    if (!name || !ip) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Machine name and IP address are required.'
      });
    }

    const newMachine: Machine = {
      id: randomUUID(),
      name: String(name).trim(),
      ip: String(ip).trim(),
      daemonPort: Number(daemonPort) || 9100,
      apiKey: apiKey ? String(apiKey).trim() : '',
      sshPort: Number(sshPort) || 22,
      sshUser: sshUser ? String(sshUser).trim() : 'root',
      sshAuthType: sshAuthType === 'key' ? 'key' : 'password',
      sshPassword: sshPassword || '',
      sshKeyFile: sshKeyFile || sshPrivateKey || '',
      addedAt: new Date().toISOString()
    };

    environment.settings.machines.push(newMachine);
    saveJsonFile();

    return {
      success: true,
      machine: {
        id: newMachine.id,
        name: newMachine.name,
        ip: newMachine.ip,
        daemonPort: newMachine.daemonPort,
        sshPort: newMachine.sshPort,
        sshUser: newMachine.sshUser,
        sshAuthType: newMachine.sshAuthType,
        sshKeyFile: newMachine.sshKeyFile
      }
    };
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
