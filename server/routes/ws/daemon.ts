import { environment, type Machine } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';
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

    if (!environment.settings.machines) {
      environment.settings.machines = [];
    }

    let machine = environment.settings.machines.find((m) => m.id === machineId);

    // Auto-Discovery & Zero-Touch Enrollment:
    // If the daemon connects with a new Machine ID, automatically register the machine!
    if (!machine) {
      const nodeReq = (peer as any)._internal?.nodeReq;
      const req = (peer as any).request;
      const rawIp =
        nodeReq?.headers?.['x-forwarded-for']?.toString().split(',')[0].trim() ||
        req?.headers?.get?.('x-forwarded-for')?.split(',')[0].trim() ||
        nodeReq?.socket?.remoteAddress ||
        (req?.socket as any)?.remoteAddress ||
        '127.0.0.1';
      const cleanIp = rawIp.replace(/^::ffff:/, '');

      machine = {
        id: machineId,
        name: `Node-${machineId.substring(0, 6)}`,
        ip: cleanIp,
        daemonPort: 9100,
        apiKey: token || '',
        sshPort: 22,
        sshUser: 'root',
        sshAuthType: 'key',
        addedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };

      environment.settings.machines.push(machine);
      saveJsonFile();
      console.log(`[Auto-Enroll] Automatically enrolled new machine: ${machine.name} (${machine.id}) with IP ${machine.ip}`);
    } else {
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
      } else if (token) {
        // First-time token assignment
        machine.apiKey = token;
        saveJsonFile();
      }
      machine.lastSeen = new Date().toISOString();
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

        if (!machineId) {
          peer.send(JSON.stringify({ type: 'error', message: 'Missing machineId' }));
          peer.close();
          return;
        }

        if (!environment.settings.machines) {
          environment.settings.machines = [];
        }

        let machine = environment.settings.machines.find((m) => m.id === machineId);

        if (!machine) {
          machine = {
            id: machineId,
            name: `Node-${machineId.substring(0, 6)}`,
            ip: '127.0.0.1',
            daemonPort: 9100,
            apiKey: token || '',
            sshPort: 22,
            sshUser: 'root',
            sshAuthType: 'key',
            addedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
          };
          environment.settings.machines.push(machine);
          saveJsonFile();
        } else if (machine.apiKey && token !== machine.apiKey) {
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
        const norm = daemonManager.updateTelemetry(machineId, payload.data);

        // Auto-update machine metadata (hostname & IP address) from live telemetry
        if (environment.settings?.machines) {
          const m = environment.settings.machines.find((item) => item.id === machineId);
          if (m) {
            let changed = false;
            if (norm.hostname && (m.name.startsWith('Node-') || !m.name)) {
              m.name = norm.hostname;
              changed = true;
            }
            if (Array.isArray(norm.ipAddresses) && norm.ipAddresses.length > 0) {
              const nonLoopbackIp = norm.ipAddresses.find(
                (ip: string) => !ip.startsWith('127.') && ip !== '::1' && !ip.startsWith('169.254.')
              );
              const primaryIp = nonLoopbackIp || norm.ipAddresses[0];
              if (primaryIp && (m.ip === '127.0.0.1' || !m.ip || m.ip.startsWith('::'))) {
                m.ip = primaryIp;
                changed = true;
              }
            }
            m.lastSeen = new Date().toISOString();
            if (changed) {
              saveJsonFile();
              console.log(`[Auto-Enroll] Updated machine specifications: Name="${m.name}", IP="${m.ip}"`);
            }
          }
        }
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
