import * as os from 'os';
import * as path from 'path';

export interface NodeService {
  id: string;
  name: string; // e.g. "WebServer1", "PostgreSQL", "GameServer"
  port: number; // e.g. 1337, 8080, 5432
  protocol: 'http' | 'https' | 'tcp' | 'udp' | 'ssh' | 'custom';
  path?: string; // e.g. "/" or "/api/health"
  publicUrl?: string; // e.g. "https://plex.example.com" or "https://dashboard.mycloud.org"
  probeIntervalSeconds?: number; // e.g. 5, 10, 30, 60 (0 = manual only, default: 15)
  status?: 'online' | 'offline' | 'checking' | 'unknown';
  lastChecked?: string;
  latencyMs?: number;
}

export interface InfrastructureDevice {
  id: string;
  name: string; // e.g. "Core Router", "Lab Switch", "Cloud Gateway"
  type: 'router' | 'switch' | 'gateway' | 'firewall' | 'subnet' | 'server' | 'custom';
  ip?: string; // e.g. "100.64.0.1"
  cidr?: string; // e.g. "100.64.0.1/16" or "192.168.178.0/24"
  description?: string;
  icon?: string;
  services?: NodeService[];
  customPosition?: { x: number; y: number };
  disabledInGraph?: boolean;
}

export interface InfrastructureSettings {
  devices: InfrastructureDevice[];
  nodeServices: Record<string, NodeService[]>; // machineId -> NodeService[]
  customLinks?: Array<{ source: string; target: string; label?: string }>;
  nodePositions?: Record<string, { x: number; y: number }>;
  disabledNodes?: string[]; // IDs of nodes (machines/devices) disabled in graph
}

export interface Machine {
  id: string;
  name: string;
  ip: string;
  daemonPort: number;
  apiKey: string;
  sshPort: number;
  sshUser: string;
  sshAuthType: 'password' | 'key';
  sshPassword?: string;
  sshKeyFile?: string;
  status?: 'pending' | 'approved' | 'rejected';
  addedAt: string;
  lastSeen?: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  targetType: 'all_machines' | 'machine' | 'all_services' | 'service';
  targetId?: string; // machine ID or service ID
  targetName?: string; // display name for target
  triggerType: 'status' | 'usage'; // status (online/offline) or usage (cpu/ram/disk)
  statusCondition?: 'both' | 'offline_only' | 'online_only'; // for status
  metricType?: 'cpu' | 'ram' | 'disk'; // for usage
  thresholdPercent?: number; // 1-100 for usage triggers
  customWebhookUrl?: string; // optional per-rule override
  cooldownMinutes?: number; // per-rule cooldown minutes
  createdAt: string;
}

export interface NotificationSettings {
  discord_webhook_url?: string;
  discord_enabled?: boolean;
  cooldown_minutes?: number; // global default cooldown
  rules: NotificationRule[];
}

export interface SettingsJsonFile {
  password_hash: string;
  jwt_secret: string;
  onboarded: boolean;
  two_factor_enabled?: boolean;
  two_factor_secret?: string | null;
  default_ssh_key?: string;
  machines: Machine[];
  infrastructure?: InfrastructureSettings;
  notifications?: NotificationSettings;
}

export namespace environment {
  export const jwt_globals = {
    get secret(): string {
      return process.env.JWT_SECRET || (environment.settings && environment.settings.jwt_secret) || "controlcenter-secret-key-fallback-32chars";
    }
  };

  export namespace paths {
    export let data: string = process.env.DATA_DIR || path.join(os.homedir(), '.controlcenter');
    export let sshKeys: string = path.join(os.homedir(), '.ssh', 'ControlCenterKeys');
    export let certs: string = path.join(paths.data, 'certs');
  }

  export namespace files {
    export let settings: string = path.join(paths.data, 'settings.json');
    export let cert: string = path.join(paths.certs, 'cert.pem');
    export let key: string = path.join(paths.certs, 'key.pem');
  }

  export let settings: SettingsJsonFile = {
    password_hash: '',
    jwt_secret: '',
    onboarded: false,
    two_factor_enabled: false,
    two_factor_secret: null,
    machines: [],
    infrastructure: {
      devices: [],
      nodeServices: {},
      customLinks: [],
      nodePositions: {}
    },
    notifications: {
      discord_webhook_url: '',
      discord_enabled: false,
      cooldown_minutes: 5,
      rules: []
    }
  };
}