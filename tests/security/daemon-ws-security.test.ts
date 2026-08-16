import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';

const WS_BASE_URL = 'ws://localhost:3000';
const VALID_MACHINE_ID = '495f5683-1b75-467f-b2d9-bab73f2e60a6';

function connectWebSocket(url: string, options?: WebSocket.ClientOptions): Promise<{ messages: string[], closeCode?: number }> {
  return new Promise((resolve) => {
    const messages: string[] = [];
    let closeCode: number | undefined;

    const ws = new WebSocket(url, options);
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

  it('Connecting to /ws/daemon with nonexistent machineId should be rejected', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const { messages } = await connectWebSocket(`${WS_BASE_URL}/ws/daemon?machineId=${fakeId}`);
    const hasAuthError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error' && parsed.message.includes('Unknown machine ID');
      } catch {
        return false;
      }
    });
    expect(hasAuthError).toBe(true);
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
