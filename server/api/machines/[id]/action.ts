import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';
import { daemonManager } from '~/server/util/daemonManager';

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

  try {
    const result = await daemonManager.dispatchAction(machine.id, action as 'restart' | 'shutdown');
    return {
      success: true,
      message: result.message || `Command '${action}' sent to machine ${machine.name} via secure tunnel.`
    };
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: `Failed to dispatch '${action}' command: ${err.message}`
    });
  }
});

