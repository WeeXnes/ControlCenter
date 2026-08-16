import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';
import { daemonManager } from '~/server/util/daemonManager';

export default defineWebSocketHandler({
  open(peer) {
    let rawUrl =
      (peer as any).request?.url ||
      (peer as any)._internal?.nodeReq?.url ||
      '';
    if (rawUrl && !rawUrl.startsWith('http') && !rawUrl.startsWith('/')) {
      rawUrl = '/' + rawUrl;
    }

    const url = new URL(rawUrl || '/ws/daemon', 'http://localhost');

    if (!environment.settings || !environment.settings.jwt_secret) {
      loadJsonFile();
    }

    const machineId =
      url.searchParams.get('machineId') ||
      url.searchParams.get('machineid') ||
      url.searchParams.get('id');

    let token =
      url.searchParams.get('token') ||
      url.searchParams.get('key') ||
      url.searchParams.get('apiKey');

    // Also check headers if query param is not used
    if (!token) {
      const req = (peer as any).request;
      const nodeReq = (peer as any)._internal?.nodeReq;
      const apiKeyHeader =
        req?.headers?.get?.('x-api-key') ||
        nodeReq?.headers?.['x-api-key'] ||
        (req?.headers as any)?.['x-api-key'] ||
        '';
      if (apiKeyHeader) token = apiKeyHeader;
    }

    if (!machineId) {
      peer.send(
        JSON.stringify({
          type: 'error',
          message: 'Authentication failed: Missing machineId parameter.'
        })
      );
      peer.close();
      return;
    }

    const machine = environment.settings.machines.find((m) => m.id === machineId);
    if (!machine) {
      peer.send(
        JSON.stringify({
          type: 'error',
          message: `Authentication failed: Unknown machine ID (${machineId}).`
        })
      );
      peer.close();
      return;
    }

    // Validate token if machine has an apiKey configured
    if (machine.apiKey) {
      if (!token || token !== machine.apiKey) {
        peer.send(
          JSON.stringify({
            type: 'error',
            message: 'Authentication failed: Invalid or missing API key token.'
          })
        );
        peer.close();
        return;
      }
    }

    (peer as any)._machineId = machine.id;
    (peer as any)._authenticated = true;

    daemonManager.registerDaemon(machine.id, peer);

    peer.send(
      JSON.stringify({
        type: 'authenticated',
        machineId: machine.id,
        machineName: machine.name,
        message: 'Successfully authenticated with ControlCenter server.'
      })
    );
  },

  message(peer, message) {
    try {
      const payload = JSON.parse(message.text());

      // If client authenticates via initial message payload
      if (payload.type === 'auth' && !(peer as any)._authenticated) {
        if (!environment.settings || !environment.settings.jwt_secret) {
          loadJsonFile();
        }

        const machineId = payload.machineId || payload.id;
        const token = payload.token || payload.key || payload.apiKey;

        const machine = environment.settings.machines.find((m) => m.id === machineId);
        if (!machine || (machine.apiKey && token !== machine.apiKey)) {
          peer.send(
            JSON.stringify({
              type: 'error',
              message: 'Authentication failed: Invalid machine credentials.'
            })
          );
          peer.close();
          return;
        }

        (peer as any)._machineId = machine.id;
        (peer as any)._authenticated = true;
        daemonManager.registerDaemon(machine.id, peer);
        peer.send(
          JSON.stringify({
            type: 'authenticated',
            machineId: machine.id,
            message: 'Successfully authenticated.'
          })
        );
        return;
      }

      if (!(peer as any)._authenticated) {
        peer.send(JSON.stringify({ type: 'error', message: 'Unauthorized frame.' }));
        return;
      }

      const machineId = (peer as any)._machineId;

      if (payload.type === 'telemetry' && payload.data) {
        daemonManager.updateTelemetry(machineId, payload.data);
      } else if (payload.type === 'action_result') {
        daemonManager.handleActionResult(
          payload.actionId,
          payload.success,
          payload.message
        );
      } else if (payload.type === 'ping') {
        peer.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // Ignore unparseable frames
    }
  },

  close(peer) {
    const machineId = (peer as any)._machineId;
    if (machineId) {
      daemonManager.unregisterDaemon(machineId, peer);
    }
  }
});
