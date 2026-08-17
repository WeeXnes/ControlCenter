import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { environment, type Machine } from '~/core/globals';

const MAX_SCROLLBACK_BYTES = 512 * 1024; // 512 KB scrollback buffer
const IDLE_SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes grace period with 0 attached clients

export class SshSession {
  public machineId: string;
  public machineName: string;
  public client: Client | null = null;
  public stream: any = null;
  public scrollback: string = '';
  public attachedPeers: Set<any> = new Set();
  public status: 'connecting' | 'connected' | 'closed' = 'connecting';
  public lastActivity: number = Date.now();
  public cols: number = 80;
  public rows: number = 24;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(machineId: string, machineName: string, initialCols = 80, initialRows = 24) {
    this.machineId = machineId;
    this.machineName = machineName;
    this.cols = initialCols;
    this.rows = initialRows;
  }

  public appendOutput(data: string) {
    this.lastActivity = Date.now();
    this.scrollback += data;
    if (this.scrollback.length > MAX_SCROLLBACK_BYTES) {
      this.scrollback = this.scrollback.slice(-MAX_SCROLLBACK_BYTES);
    }

    const payload = JSON.stringify({ type: 'output', data });
    for (const peer of this.attachedPeers) {
      try {
        peer.send(payload);
      } catch (err: any) {
        console.warn(`[SshSession] Error sending to peer: ${err.message}`);
      }
    }
  }

  public broadcast(type: string, data: string) {
    const payload = JSON.stringify({ type, data });
    for (const peer of this.attachedPeers) {
      try {
        peer.send(payload);
      } catch (err: any) {
        console.warn(`[SshSession] Error broadcasting to peer: ${err.message}`);
      }
    }
  }

  public attachPeer(peer: any) {
    this.attachedPeers.add(peer);
    this.lastActivity = Date.now();

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Replay existing scrollback buffer so terminal restores state
    if (this.scrollback) {
      try {
        peer.send(JSON.stringify({
          type: 'output',
          data: this.scrollback,
          isReplay: true
        }));
      } catch {}
    }

    if (this.status === 'connected') {
      try {
        peer.send(JSON.stringify({
          type: 'status',
          data: `\x1b[32m[ControlCenter] Resumed persistent SSH session for ${this.machineName}.\x1b[0m\r\n`
        }));
      } catch {}
    }
  }

  public detachPeer(peer: any) {
    this.attachedPeers.delete(peer);
    this.lastActivity = Date.now();

    if (this.attachedPeers.size === 0 && this.status !== 'closed') {
      // Start grace period idle timer
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        console.log(`[SshSession] Idle timeout reached for machine ${this.machineId}. Closing background session.`);
        this.close();
      }, IDLE_SESSION_TIMEOUT_MS);
    }
  }

  public writeInput(data: string) {
    this.lastActivity = Date.now();
    if (this.stream && this.status === 'connected') {
      try {
        this.stream.write(data);
      } catch (err: any) {
        console.error(`[SshSession] Error writing input to stream: ${err.message}`);
      }
    }
  }

  public resize(cols: number, rows: number) {
    this.cols = Number(cols) || 80;
    this.rows = Number(rows) || 24;
    if (this.stream && this.status === 'connected') {
      try {
        this.stream.setWindow(this.rows, this.cols, this.rows * 17, this.cols * 9);
      } catch {}
    }
  }

  public close() {
    this.status = 'closed';
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this.broadcast('status', '\r\n\x1b[33m[ControlCenter] SSH session terminated.\x1b[0m\r\n');

    if (this.stream) {
      try {
        this.stream.end();
      } catch {}
      this.stream = null;
    }

    if (this.client) {
      try {
        this.client.end();
      } catch {}
      this.client = null;
    }

    sshSessionManager.removeSession(this.machineId);
  }
}

class SshSessionManager {
  private sessions: Map<string, SshSession> = new Map();

  public getSession(machineId: string): SshSession | undefined {
    return this.sessions.get(machineId);
  }

  public hasActiveSession(machineId: string): boolean {
    const session = this.sessions.get(machineId);
    return !!session && session.status === 'connected';
  }

  public createSession(
    machine: Machine,
    initialCols = 80,
    initialRows = 24,
    onReady?: (session: SshSession) => void,
    onError?: (err: Error) => void
  ): SshSession {
    // If existing session is running, close it first
    const existing = this.sessions.get(machine.id);
    if (existing) {
      existing.close();
    }

    const session = new SshSession(machine.id, machine.name, initialCols, initialRows);
    this.sessions.set(machine.id, session);

    const ssh = new Client();
    session.client = ssh;

    const host = machine.ip || '127.0.0.1';
    const port = machine.sshPort || 22;
    const user = machine.sshUser || 'root';

    session.broadcast(
      'status',
      `\x1b[33mConnecting to ${machine.name} (${user}@${host}:${port})...\x1b[0m\r\n`
    );

    ssh.on('ready', () => {
      session.broadcast(
        'status',
        `\x1b[32mSSH Connection Established to ${machine.name}.\x1b[0m\r\n\r\n`
      );

      ssh.shell(
        {
          term: 'xterm-256color',
          cols: session.cols,
          rows: session.rows
        },
        (err, stream) => {
          if (err) {
            session.broadcast(
              'error',
              `\r\n\x1b[31mSSH Shell creation failed: ${err.message}\x1b[0m\r\n`
            );
            session.close();
            onError?.(err);
            return;
          }

          session.stream = stream;
          session.status = 'connected';

          // Apply client dimensions
          try {
            stream.setWindow(session.rows, session.cols, session.rows * 17, session.cols * 9);
          } catch {}

          stream.on('data', (data: Buffer) => {
            session.appendOutput(data.toString('utf-8'));
          });

          stream.on('close', () => {
            session.broadcast(
              'status',
              '\r\n\x1b[33m[ControlCenter] Connection closed by remote host.\x1b[0m\r\n'
            );
            session.close();
          });

          onReady?.(session);
        }
      );
    });

    ssh.on('error', (err: any) => {
      session.broadcast(
        'error',
        `\r\n\x1b[31mSSH Error: ${err.message || err}\x1b[0m\r\n`
      );
      session.close();
      onError?.(err);
    });

    const connectConfig: any = {
      host,
      port,
      username: user,
      readyTimeout: 10000
    };

    if (machine.sshAuthType === 'key') {
      let keyContent = '';
      if (machine.sshKeyFile) {
        const keyFileName = machine.sshKeyFile.trim();
        if (!keyFileName.includes('/') && !keyFileName.includes('\\') && !keyFileName.includes('..')) {
          const keyPath = path.join(environment.paths.sshKeys, keyFileName);
          if (fs.existsSync(keyPath)) {
            keyContent = fs.readFileSync(keyPath, 'utf8');
          }
        }
      }
      if (!keyContent && (machine as any).sshPrivateKey) {
        keyContent = (machine as any).sshPrivateKey;
      }
      if (keyContent) {
        connectConfig.privateKey = keyContent;
      } else {
        session.broadcast(
          'error',
          `\r\n\x1b[31m[ControlCenter] Error: SSH key file "${machine.sshKeyFile || 'unspecified'}" not found in ~/.ssh/ControlCenterKeys/\x1b[0m\r\n`
        );
        session.close();
        onError?.(new Error('SSH Key file not found'));
        return session;
      }
    } else if (machine.sshPassword) {
      connectConfig.password = machine.sshPassword;
    }

    try {
      ssh.connect(connectConfig);
    } catch (e: any) {
      session.broadcast(
        'error',
        `\r\n\x1b[31mFailed to initiate SSH connection: ${e.message}\x1b[0m\r\n`
      );
      session.close();
      onError?.(e);
    }

    return session;
  }

  public removeSession(machineId: string) {
    this.sessions.delete(machineId);
  }

  public closeSession(machineId: string) {
    const session = this.sessions.get(machineId);
    if (session) {
      session.close();
    }
  }
}

export const sshSessionManager = new SshSessionManager();
