import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { environment } from '~/core/globals';
import {
  listSshKeys,
  getDefaultKeyName,
  setDefaultKeyName,
  getPublicKey,
  ensureSshKeyDirectory
} from '~/server/util/sshKeyManager';

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
  ensureSshKeyDirectory();

  if (method === 'GET') {
    try {
      const keys = listSshKeys();
      const defaultKey = getDefaultKeyName();
      const defaultPublicKey = defaultKey ? getPublicKey(defaultKey) : null;

      return {
        keys,
        defaultKey,
        defaultPublicKey
      };
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to read SSH keys directory: ${err.message}`
      });
    }
  }

  if (method === 'PUT') {
    const body = await readBody(event).catch(() => ({}));
    const defaultKey = body?.defaultKey ? String(body.defaultKey).trim() : '';

    if (!defaultKey || !setDefaultKeyName(defaultKey)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid or nonexistent key name "${defaultKey}"`
      });
    }

    const defaultPublicKey = getPublicKey(defaultKey);
    return {
      success: true,
      defaultKey,
      defaultPublicKey,
      message: `Default SSH key updated to "${defaultKey}"`
    };
  }

  if (method === 'POST') {
    const body = await readBody(event);
    const filename = body?.filename ? String(body.filename).trim() : '';
    const content = body?.content ? String(body.content) : '';
    const makeDefault = Boolean(body?.makeDefault);

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

      // Automatically extract/generate .pub file
      try {
        execSync(`ssh-keygen -y -f ${JSON.stringify(targetPath)} > ${JSON.stringify(pubPath)}`);
        fs.chmodSync(pubPath, 0o644);
      } catch {}

      const keys = listSshKeys();
      if (makeDefault || keys.length === 1 || filename === 'default') {
        setDefaultKeyName(filename);
      }

      const publicKey = getPublicKey(filename);

      return {
        success: true,
        filename,
        publicKey
      };
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to save SSH key file: ${err.message}`
      });
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
