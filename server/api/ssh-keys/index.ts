import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { environment } from '~/core/globals';

function ensureDirectoryExists() {
  if (!fs.existsSync(environment.paths.sshKeys)) {
    fs.mkdirSync(environment.paths.sshKeys, { recursive: true, mode: 0o700 });
  }
}

function isValidFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  const trimmed = filename.trim();
  if (!trimmed || trimmed.startsWith('.') || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    return false;
  }
  return /^[a-zA-Z0-9_\-\.]+$/.test(trimmed);
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  ensureDirectoryExists();

  if (method === 'GET') {
    try {
      const files = fs.readdirSync(environment.paths.sshKeys);
      const keys = files.filter(file => {
        if (file.startsWith('.') || file.endsWith('.pub')) return false;
        try {
          const fullPath = path.join(environment.paths.sshKeys, file);
          return fs.statSync(fullPath).isFile();
        } catch {
          return false;
        }
      });
      return { keys };
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to read SSH keys directory: ${err.message}`
      });
    }
  }

  if (method === 'POST') {
    const body = await readBody(event);
    const filename = body?.filename ? String(body.filename).trim() : '';
    const content = body?.content ? String(body.content) : '';

    if (!filename || !isValidFilename(filename)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid filename. Only alphanumeric characters, hyphens, underscores, and dots are allowed (no path traversal).'
      });
    }

    if (!content.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'SSH private key content cannot be empty.'
      });
    }

    const targetPath = path.join(environment.paths.sshKeys, filename);
    const pubPath = `${targetPath}.pub`;
    const formattedContent = content.trim() + '\n';

    try {
      fs.writeFileSync(targetPath, formattedContent, { mode: 0o600 });
      fs.chmodSync(targetPath, 0o600);

      // Automatically generate .pub file for ssh-copy-id compatibility
      try {
        execSync(`ssh-keygen -y -f ${JSON.stringify(targetPath)} > ${JSON.stringify(pubPath)}`);
        fs.chmodSync(pubPath, 0o644);
      } catch {
        // Ignore pubkey generation errors if key type is unsupported by local ssh-keygen
      }

      return { success: true, filename };
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to save SSH key file: ${err.message}`
      });
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
