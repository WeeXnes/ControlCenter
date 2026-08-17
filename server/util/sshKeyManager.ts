import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { environment } from '~/core/globals';
import { saveJsonFile } from '~/util/jsonLoader';

export function ensureSshKeyDirectory(): string {
  const dir = environment.paths.sshKeys;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

export function listSshKeys(): string[] {
  ensureSshKeyDirectory();
  try {
    const files = fs.readdirSync(environment.paths.sshKeys);
    return files.filter((file) => {
      if (file.startsWith('.') || file.endsWith('.pub')) return false;
      try {
        const fullPath = path.join(environment.paths.sshKeys, file);
        return fs.statSync(fullPath).isFile();
      } catch {
        return false;
      }
    });
  } catch (err: any) {
    console.error('[SSHKeyManager] Error listing keys:', err.message);
    return [];
  }
}

export function getDefaultKeyName(): string | null {
  const keys = listSshKeys();
  if (keys.length === 0) return null;

  if (environment.settings?.default_ssh_key && keys.includes(environment.settings.default_ssh_key)) {
    return environment.settings.default_ssh_key;
  }

  if (keys.includes('default')) {
    return 'default';
  }

  return keys[0];
}

export function setDefaultKeyName(name: string): boolean {
  const keys = listSshKeys();
  if (!keys.includes(name)) return false;

  if (environment.settings) {
    environment.settings.default_ssh_key = name;
    saveJsonFile();
  }
  return true;
}

export function getPublicKey(keyName: string): string | null {
  ensureSshKeyDirectory();
  const cleanName = path.basename(keyName).replace(/[^a-zA-Z0-9_\-]/g, '').trim();
  if (!cleanName) return null;

  const privatePath = path.join(environment.paths.sshKeys, cleanName);
  const pubPath = `${privatePath}.pub`;

  if (!fs.existsSync(privatePath)) return null;

  // Try reading existing .pub file
  if (fs.existsSync(pubPath)) {
    try {
      const content = fs.readFileSync(pubPath, 'utf8').trim();
      if (content) return content;
    } catch {}
  }

  // Generate .pub from private key via ssh-keygen
  try {
    const pubContent = execSync(`ssh-keygen -y -f ${JSON.stringify(privatePath)}`, {
      encoding: 'utf8'
    }).trim();

    if (pubContent) {
      fs.writeFileSync(pubPath, pubContent + '\n', { mode: 0o644 });
      return pubContent;
    }
  } catch (err: any) {
    console.error(`[SSHKeyManager] Failed to extract public key for ${cleanName}:`, err.message);
  }

  return null;
}

export function generateSshKeyPair(name = 'default'): { filename: string; publicKey: string } {
  ensureSshKeyDirectory();
  const cleanName = path.basename(name).replace(/[^a-zA-Z0-9_\-]/g, '').trim() || 'default';
  const targetPath = path.join(environment.paths.sshKeys, cleanName);
  const pubPath = `${targetPath}.pub`;

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
  if (fs.existsSync(pubPath)) {
    fs.unlinkSync(pubPath);
  }

  try {
    execSync(
      `ssh-keygen -t ed25519 -N "" -C "controlcenter-admin" -f ${JSON.stringify(targetPath)}`,
      { stdio: 'ignore' }
    );
  } catch {
    // Fallback to RSA 4096 if ed25519 is not supported by legacy ssh-keygen
    execSync(
      `ssh-keygen -t rsa -b 4096 -N "" -C "controlcenter-admin" -f ${JSON.stringify(targetPath)}`,
      { stdio: 'ignore' }
    );
  }

  fs.chmodSync(targetPath, 0o600);
  if (fs.existsSync(pubPath)) {
    fs.chmodSync(pubPath, 0o644);
  }

  const pubKey = getPublicKey(cleanName) || '';

  if (environment.settings) {
    environment.settings.default_ssh_key = cleanName;
    saveJsonFile();
  }

  console.log(`[SSHKeyManager] Generated new SSH keypair: ${cleanName}`);
  return {
    filename: cleanName,
    publicKey: pubKey
  };
}
