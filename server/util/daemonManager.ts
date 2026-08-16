import { randomUUID } from 'crypto';

export interface TelemetryPayload {
  hostname?: string;
  userName?: string;
  os?: string;
  cpuModel?: string;
  cpuCores?: number;
  cpuUsagePercent?: number;
  ramTotalBytes?: number;
  ramUsedBytes?: number;
  ramUsagePercent?: number;
  diskTotalBytes?: number;
  diskUsedBytes?: number;
  diskUsagePercent?: number;
  uptimeSeconds?: number;
  ipAddresses?: string[];
  timestamp?: string;
}

interface DaemonConnection {
  peer: any;
  connectedAt: string;
  lastSeen: string;
}

export function normalizeTelemetry(raw: any): TelemetryPayload {
  if (!raw || typeof raw !== 'object') return {};
  return {
    hostname: raw.hostname || raw.Hostname || '',
    userName: raw.userName || raw.username || raw.UserName || raw.user || raw.User || '',
    os: raw.os || raw.Os || '',
    cpuModel: raw.cpuModel || raw.CpuModel || '',
    cpuCores: Number(raw.cpuCores ?? raw.CpuCores ?? 1),
    cpuUsagePercent: Number(raw.cpuUsagePercent ?? raw.CpuUsagePercent ?? 0),
    ramTotalBytes: Number(raw.ramTotalBytes ?? raw.RamTotalBytes ?? 0),
    ramUsedBytes: Number(raw.ramUsedBytes ?? raw.RamUsedBytes ?? 0),
    ramUsagePercent: Number(raw.ramUsagePercent ?? raw.RamUsagePercent ?? 0),
    diskTotalBytes: Number(raw.diskTotalBytes ?? raw.DiskTotalBytes ?? 0),
    diskUsedBytes: Number(raw.diskUsedBytes ?? raw.DiskUsedBytes ?? 0),
    diskUsagePercent: Number(raw.diskUsagePercent ?? raw.DiskUsagePercent ?? 0),
    uptimeSeconds: Number(raw.uptimeSeconds ?? raw.UptimeSeconds ?? 0),
    ipAddresses: Array.isArray(raw.ipAddresses || raw.IpAddresses)
      ? (raw.ipAddresses || raw.IpAddresses)
      : [],
    timestamp: raw.timestamp || raw.Timestamp || new Date().toISOString()
  };
}

class DaemonManager {
  private activeConnections = new Map<string, DaemonConnection>();
  private telemetryCache = new Map<string, { data: TelemetryPayload; lastSeen: string }>();
  private pendingActions = new Map<string, { resolve: (res: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>();

  public registerDaemon(machineId: string, peer: any) {
    const now = new Date().toISOString();
    this.activeConnections.set(machineId, {
      peer,
      connectedAt: now,
      lastSeen: now
    });
    console.log(`[DaemonManager] Node connected: ${machineId}`);
  }

  public unregisterDaemon(machineId: string, peer?: any) {
    const existing = this.activeConnections.get(machineId);
    if (!existing) return;

    // Only unregister if the peer matches (avoids race condition when reconnecting)
    if (!peer || existing.peer === peer) {
      this.activeConnections.delete(machineId);
      console.log(`[DaemonManager] Node disconnected: ${machineId}`);
    }
  }

  public isOnline(machineId: string): boolean {
    return this.activeConnections.has(machineId);
  }

  public isDaemonConnected(machineId: string): boolean {
    return this.isOnline(machineId);
  }

  public updateTelemetry(machineId: string, data: any): TelemetryPayload {
    const now = new Date().toISOString();
    const normalized = normalizeTelemetry(data);
    const conn = this.activeConnections.get(machineId);
    if (conn) {
      conn.lastSeen = now;
    }
    this.telemetryCache.set(machineId, {
      data: {
        ...normalized,
        timestamp: now
      },
      lastSeen: now
    });
    return normalized;
  }

  public getTelemetry(machineId: string): (TelemetryPayload & { online: boolean; lastSeen?: string }) | null {
    const cached = this.telemetryCache.get(machineId);
    const online = this.isOnline(machineId);

    if (!cached) {
      return { online };
    }

    return {
      ...cached.data,
      online,
      lastSeen: cached.lastSeen
    };
  }

  public handleActionResult(actionId: string, success: boolean, message: string) {
    const pending = this.pendingActions.get(actionId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingActions.delete(actionId);
      if (success) {
        pending.resolve({ success: true, message });
      } else {
        pending.reject(new Error(message || 'Daemon action failed'));
      }
    }
  }

  public async dispatchAction(machineId: string, action: 'restart' | 'shutdown', timeoutMs = 8000): Promise<{ success: boolean; message: string }> {
    const conn = this.activeConnections.get(machineId);
    if (!conn) {
      throw new Error(`Machine is offline (not connected via WebSocket tunnel)`);
    }

    const actionId = randomUUID();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingActions.delete(actionId);
        resolve({
          success: true,
          message: `Command '${action}' sent to machine. Acknowledgment timed out, but action was dispatched.`
        });
      }, timeoutMs);

      this.pendingActions.set(actionId, { resolve, reject, timer });

      try {
        const frame = JSON.stringify({
          type: 'action',
          actionId,
          action
        });
        conn.peer.send(frame);
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingActions.delete(actionId);
        reject(new Error(`Failed to send command to daemon: ${err.message}`));
      }
    });
  }
}

export const daemonManager = new DaemonManager();
