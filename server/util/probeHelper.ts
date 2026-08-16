import * as net from 'net';

export interface ProbeResult {
  reachable: boolean;
  latencyMs: number;
  host: string;
  port: number;
  error?: string;
}

export function executeProbe(host: string, port: number, timeoutMs = 2500): Promise<ProbeResult> {
  const targetHost = String(host).trim().replace(/^::ffff:/, '');
  const targetPort = Number(port);
  const startTime = Date.now();

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

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      finish(true);
    });

    socket.on('timeout', () => {
      finish(false, 'Socket timeout');
    });

    socket.on('error', (err: any) => {
      finish(false, err.message || 'Connection refused');
    });

    try {
      socket.connect(targetPort, targetHost);
    } catch (err: any) {
      finish(false, err.message);
    }
  });
}
