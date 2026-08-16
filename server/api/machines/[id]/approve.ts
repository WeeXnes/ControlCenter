import { environment } from '~/core/globals';
import { saveJsonFile, loadJsonFile } from '~/util/jsonLoader';
import { getDefaultKeyName, getPublicKey } from '~/server/util/sshKeyManager';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const id = getRouterParam(event, 'id');

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const machine = environment.settings.machines?.find((m) => m.id === id);
  if (!machine) {
    throw createError({ statusCode: 404, statusMessage: 'Machine not found' });
  }

  machine.status = 'approved';

  const defaultKey = getDefaultKeyName();
  if (defaultKey) {
    machine.sshAuthType = 'key';
    machine.sshKeyFile = defaultKey;
    machine.sshPort = machine.sshPort || 22;
    machine.sshUser = machine.sshUser || 'root';
  }

  saveJsonFile();

  return {
    success: true,
    message: `Device "${machine.name}" approved successfully.`,
    machine
  };
});
