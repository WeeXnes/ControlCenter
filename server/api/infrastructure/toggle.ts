import { environment } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);

  if (method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
  }

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  if (!environment.settings.infrastructure) {
    environment.settings.infrastructure = {
      devices: [],
      nodeServices: {},
      customLinks: [],
      nodePositions: {},
      disabledNodes: []
    };
  }

  const infra = environment.settings.infrastructure;
  if (!Array.isArray(infra.disabledNodes)) {
    infra.disabledNodes = [];
  }

  const body = await readBody(event);
  const { nodeId, disabled } = body;

  if (!nodeId) {
    throw createError({ statusCode: 400, statusMessage: 'nodeId is required.' });
  }

  const isCurrentlyDisabled = infra.disabledNodes.includes(nodeId);
  const targetDisabled = typeof disabled === 'boolean' ? disabled : !isCurrentlyDisabled;

  if (targetDisabled && !isCurrentlyDisabled) {
    infra.disabledNodes.push(nodeId);
  } else if (!targetDisabled && isCurrentlyDisabled) {
    infra.disabledNodes = infra.disabledNodes.filter((id) => id !== nodeId);
  }

  // Also update the device object if it's a custom device
  const customDevice = (infra.devices || []).find((d) => d.id === nodeId);
  if (customDevice) {
    customDevice.disabledInGraph = targetDisabled;
  }

  saveJsonFile();

  return {
    success: true,
    nodeId,
    disabled: targetDisabled,
    disabledNodes: infra.disabledNodes
  };
});
