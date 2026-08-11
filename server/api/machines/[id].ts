import { environment } from '~/core/globals';
import { saveJsonFile, loadJsonFile } from '~/util/jsonLoader';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const method = getMethod(event);

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const index = environment.settings.machines.findIndex(m => m.id === id);
  if (index === -1) {
    throw createError({ statusCode: 404, statusMessage: 'Machine not found' });
  }

  if (method === 'GET') {
    const m = environment.settings.machines[index];
    return {
      id: m.id,
      name: m.name,
      ip: m.ip,
      daemonPort: m.daemonPort,
      sshPort: m.sshPort,
      sshUser: m.sshUser,
      sshAuthType: m.sshAuthType,
      sshKeyFile: m.sshKeyFile || '',
      sshPassword: m.sshPassword || '',
      addedAt: m.addedAt,
      lastSeen: m.lastSeen
    };
  }

  if (method === 'PUT') {
    const body = await readBody(event);
    const existing = environment.settings.machines[index];

    environment.settings.machines[index] = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      ip: body.ip !== undefined ? String(body.ip).trim() : existing.ip,
      daemonPort: body.daemonPort !== undefined ? Number(body.daemonPort) : existing.daemonPort,
      apiKey: body.apiKey !== undefined ? String(body.apiKey).trim() : existing.apiKey,
      sshPort: body.sshPort !== undefined ? Number(body.sshPort) : existing.sshPort,
      sshUser: body.sshUser !== undefined ? String(body.sshUser).trim() : existing.sshUser,
      sshAuthType: body.sshAuthType === 'key' ? 'key' : 'password',
      sshPassword: body.sshPassword !== undefined ? String(body.sshPassword) : existing.sshPassword,
      sshKeyFile: body.sshKeyFile !== undefined ? String(body.sshKeyFile) : (body.sshPrivateKey !== undefined ? String(body.sshPrivateKey) : existing.sshKeyFile)
    };

    saveJsonFile();
    return { success: true, message: 'Machine updated successfully' };
  }

  if (method === 'DELETE') {
    environment.settings.machines.splice(index, 1);
    saveJsonFile();
    return { success: true, message: 'Machine deleted successfully' };
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
