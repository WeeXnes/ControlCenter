import { environment } from '~/core/globals';
import { saveJsonFile, loadJsonFile } from '~/util/jsonLoader';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'PUT');

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const body = await readBody(event);
  const { machineIds } = body;

  if (!Array.isArray(machineIds)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request: machineIds must be an array of strings'
    });
  }

  const existingMachines = environment.settings.machines;
  
  // Validate that the provided array has the exact same IDs
  const existingIds = existingMachines.map(m => m.id);
  const isValid = machineIds.length === existingIds.length && 
                  machineIds.every(id => existingIds.includes(id));

  if (!isValid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request: provided IDs do not match existing machines'
    });
  }

  // Create new sorted array
  const sortedMachines = [];
  for (const id of machineIds) {
    const machine = existingMachines.find(m => m.id === id);
    if (machine) {
      sortedMachines.push(machine);
    }
  }

  // Update memory and disk
  environment.settings.machines = sortedMachines;
  saveJsonFile();

  return {
    success: true,
    message: 'Machines reordered successfully'
  };
});
