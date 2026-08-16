import * as net from 'net';
import * as https from 'https';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const body = await readBody(event);
  const { host, port, protocol } = body;

  if (!host || !port) {
    throw createError({ statusCode: 400, statusMessage: 'host and port are required.' });
  }

  const targetHost = String(host).trim().replace(/^::ffff:/, '');
  const targetPort = Number(port);

  if (targetPort < 1 || targetPort > 65535) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid port number.' });
  }

  const startTime = Date.now();

  // TCP Socket Probe
  return new Promise((resolve) => {
    let resolved = false;
    const socket = new net.Socket();

    const finish = (reachable: boolean, error?: string) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      const latencyMs = Date.now() - startTime;
      resolve({
        reachable,
        latencyMs: reachable ? latencyMs : -1,
        host: targetHost,
        port: targetPort,
        error: reachable ? undefined : (error || 'Connection timed out')
      });
    };

    socket.setTimeout(2500);

    socket.on('connect', () => {
      finish(true);
    });

    socket.on('timeout', () => {
      finish(false, 'Socket timeout (2500ms)');
    });

    socket.on('error', (err: any) => {
      finish(false, err.message || 'Connection refused');
    });

    socket.connect(targetPort, targetHost);
  });
});
