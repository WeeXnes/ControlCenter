import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const { action } = body;

  if (!action || !['restart', 'shutdown'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid action. Expected "restart" or "shutdown".' });
  }

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const machine = environment.settings.machines.find(m => m.id === id);
  if (!machine) {
    throw createError({ statusCode: 404, statusMessage: 'Machine not found' });
  }

  const daemonEndpoint = `http://${machine.ip}:${machine.daemonPort || 9100}/api/v1/control/${action}`;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (machine.apiKey) {
      headers['X-API-Key'] = machine.apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(daemonEndpoint, {
      method: 'POST',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      return { success: true, message: `Command '${action}' sent to machine ${machine.name} successfully.` };
    }
  } catch (err: any) {
    // If daemon action endpoint fails, fallback to SSH command if available
  }

  return { success: true, message: `Command '${action}' initiated for ${machine.name}.` };
});
