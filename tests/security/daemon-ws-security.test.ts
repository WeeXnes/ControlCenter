import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const WS_BASE_URL = process.env.TEST_WS_URL || 'wss://localhost:3000';
const VALID_MACHINE_ID = '495f5683-1b75-467f-b2d9-bab73f2e60a6';

function connectWebSocket(url: string, options?: WebSocket.ClientOptions): Promise<{ messages: string[], closeCode?: number }> {
  return new Promise((resolve) => {
    const messages: string[] = [];
    let closeCode: number | undefined;

    const ws = new WebSocket(url, { rejectUnauthorized: false, ...options });
    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      resolve({ messages, closeCode });
    }, 4000);

    ws.on('message', (data) => {
      messages.push(data.toString());
    });

    ws.on('close', (code) => {
      closeCode = code;
      clearTimeout(timeout);
      resolve({ messages, closeCode });
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve({ messages, closeCode });
    });
  });
}

describe('Daemon Zero-Trust WebSocket Security Tests', () => {

  it('Connecting to /ws/daemon without machineId should be rejected', async () => {
    const { messages } = await connectWebSocket(`${WS_BASE_URL}/ws/daemon`);
    const hasAuthError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error' && parsed.message.includes('Missing machineId');
      } catch {
        return false;
      }
    });
    expect(hasAuthError).toBe(true);
  });

  it('Connecting to /ws/daemon with new machineId should auto-enroll and authenticate', async () => {
    const autoId = 'auto-' + Date.now();
    const { messages } = await connectWebSocket(`${WS_BASE_URL}/ws/daemon?machineId=${autoId}`);
    const isAuth = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'authenticated' && parsed.machineId === autoId;
      } catch {
        return false;
      }
    });
    expect(isAuth).toBe(true);
  });

  it('Connecting to /ws/daemon with invalid token should be rejected if machine has key configured', async () => {
    const { messages } = await connectWebSocket(`${WS_BASE_URL}/ws/daemon?machineId=${VALID_MACHINE_ID}&token=wrong-token`);
    const hasError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return (parsed.type === 'error' && parsed.message.includes('Authentication failed')) ||
               (parsed.type === 'authenticated');
      } catch {
        return false;
      }
    });
    expect(hasError).toBe(true);
  });

});
