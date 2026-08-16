import * as os from 'os';
import * as path from 'path';

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
  addedAt: string;
  lastSeen?: string;
}

export interface SettingsJsonFile {
  password_hash: string;
  jwt_secret: string;
  onboarded: boolean;
  machines: Machine[];
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
    machines: []
  };
}