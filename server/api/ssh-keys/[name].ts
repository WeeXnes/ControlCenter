import fs from 'fs';
import path from 'path';
import { environment } from '~/core/globals';

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
  const name = getRouterParam(event, 'name');

  if (method === 'DELETE') {
    if (!name || !isValidFilename(name)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid key filename'
      });
    }

    const targetPath = path.join(environment.paths.sshKeys, name);
    const pubPath = `${targetPath}.pub`;

    if (!fs.existsSync(targetPath)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'SSH key file not found'
      });
    }

    try {
      fs.unlinkSync(targetPath);
      if (fs.existsSync(pubPath)) {
        try { fs.unlinkSync(pubPath); } catch {}
      }
      return { success: true, message: 'Key deleted successfully' };
    } catch (err: any) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete SSH key file: ${err.message}`
      });
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
});
