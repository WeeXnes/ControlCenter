import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE_URL = process.env.TEST_BASE_URL || 'https://localhost:3000';
const WS_BASE_URL = process.env.TEST_WS_URL || 'wss://localhost:3000';
const MACHINE_ID = '495f5683-1b75-467f-b2d9-bab73f2e60a6';

/**
 * Helper: opens a WebSocket and collects messages until the connection closes
 * or a timeout is reached. Returns all messages received.
 */
function connectWebSocket(url: string, options?: WebSocket.ClientOptions): Promise<{ messages: string[], closeCode?: number }> {
  return new Promise((resolve) => {
    const messages: string[] = [];
    let closeCode: number | undefined;

    const ws = new WebSocket(url, { rejectUnauthorized: false, ...options });
    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      resolve({ messages, closeCode });
    }, 5000);

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

describe('SSH WebSocket Security - No Authentication', () => {

  it('WebSocket connection without token should be rejected', async () => {
    const { messages } = await connectWebSocket(
      `${WS_BASE_URL}/ws/ssh?machineId=${MACHINE_ID}`
    );

    // Should receive an authentication error
    const hasAuthError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error' && parsed.data.includes('Authentication required');
      } catch {
        return false;
      }
    });
    expect(hasAuthError).toBe(true);
  });

  it('WebSocket connection with invalid token should be rejected', async () => {
    const { messages } = await connectWebSocket(
      `${WS_BASE_URL}/ws/ssh?machineId=${MACHINE_ID}&token=invalid.jwt.token`
    );

    const hasAuthError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error' && parsed.data.includes('Invalid or expired');
      } catch {
        return false;
      }
    });
    expect(hasAuthError).toBe(true);
  });

  it('WebSocket connection with forged JWT (wrong secret) should be rejected', async () => {
    // This is a valid-format JWT but signed with the wrong secret
    const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    const { messages } = await connectWebSocket(
      `${WS_BASE_URL}/ws/ssh?machineId=${MACHINE_ID}&token=${forgedToken}`
    );

    const hasAuthError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error' && parsed.data.includes('Invalid or expired');
      } catch {
        return false;
      }
    });
    expect(hasAuthError).toBe(true);
  });

  it('WebSocket connection with expired JWT should be rejected', async () => {
    // JWT with exp claim in the past (exp: 1000000000 = 2001)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImlhdCI6MTAwMDAwMDAwMCwiZXhwIjoxMDAwMDAwMDAxfQ.invalidsig';

    const { messages } = await connectWebSocket(
      `${WS_BASE_URL}/ws/ssh?machineId=${MACHINE_ID}&token=${expiredToken}`
    );

    const hasAuthError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error' &&
          (parsed.data.includes('Invalid or expired') || parsed.data.includes('Authentication required'));
      } catch {
        return false;
      }
    });
    expect(hasAuthError).toBe(true);
  });

  it('WebSocket connection with partial 2FA token (isPartial: true) should be rejected', async () => {
    // Generate a temporary partial token
    const partialToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImlzUGFydGlhbCI6dHJ1ZSwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.invalid';

    const { messages } = await connectWebSocket(
      `${WS_BASE_URL}/ws/ssh?machineId=${MACHINE_ID}&token=${partialToken}`
    );

    const hasAuthError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error' &&
          (parsed.data.includes('Incomplete authentication') || parsed.data.includes('Invalid or expired') || parsed.data.includes('Authentication required'));
      } catch {
        return false;
      }
    });
    expect(hasAuthError).toBe(true);
  });
});

describe('SSH WebSocket Security - Missing Machine ID', () => {

  it('WebSocket connection without machineId should be rejected (even if token were valid)', async () => {
    // No token and no machineId - should hit auth error first
    const { messages } = await connectWebSocket(
      `${WS_BASE_URL}/ws/ssh`
    );

    // Should get auth error (checked before machineId)
    const hasError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error';
      } catch {
        return false;
      }
    });
    expect(hasError).toBe(true);
  });
});

describe('SSH WebSocket Security - Cookie-based Token Injection', () => {

  it('WebSocket with forged cookie should be rejected', async () => {
    const { messages } = await connectWebSocket(
      `${WS_BASE_URL}/ws/ssh?machineId=${MACHINE_ID}`,
      {
        headers: {
          'Cookie': 'token=forged.cookie.token'
        }
      }
    );

    const hasAuthError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error' &&
          (parsed.data.includes('Invalid or expired') || parsed.data.includes('Authentication required'));
      } catch {
        return false;
      }
    });
    expect(hasAuthError).toBe(true);
  });

  it('WebSocket with empty cookie should be rejected', async () => {
    const { messages } = await connectWebSocket(
      `${WS_BASE_URL}/ws/ssh?machineId=${MACHINE_ID}`,
      {
        headers: {
          'Cookie': 'token='
        }
      }
    );

    const hasError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error';
      } catch {
        return false;
      }
    });
    expect(hasError).toBe(true);
  });
});

describe('SSH WebSocket Security - Enumeration Protection', () => {

  it('WebSocket to nonexistent machine without auth should get auth error (not machine info leak)', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const { messages } = await connectWebSocket(
      `${WS_BASE_URL}/ws/ssh?machineId=${fakeId}`
    );

    // Should get auth error, NOT "machine not found" (which would leak existence info)
    const hasAuthError = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.type === 'error' && parsed.data.includes('Authentication required');
      } catch {
        return false;
      }
    });

    const hasMachineNotFound = messages.some(msg => {
      try {
        const parsed = JSON.parse(msg);
        return parsed.data?.includes('Machine not found');
      } catch {
        return false;
      }
    });

    expect(hasAuthError).toBe(true);
    expect(hasMachineNotFound).toBe(false); // Must NOT reveal machine existence
  });
});
