import { defineEventHandler, readBody, createError, assertMethod } from 'h3';
import bcrypt from 'bcryptjs';
import { environment } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const body = await readBody(event).catch(() => ({}));
  const { currentPassword, newPassword } = body || {};

  if (!currentPassword || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Current password and new password are required.'
    });
  }

  if (newPassword.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'New password must be at least 6 characters long.'
    });
  }

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  if (!environment.settings.password_hash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Admin account is not configured.'
    });
  }

  const isMatch = await bcrypt.compare(currentPassword, environment.settings.password_hash);
  if (!isMatch) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Current password is incorrect.'
    });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  environment.settings.password_hash = newHash;
  saveJsonFile();

  console.log('[Security] Admin password changed successfully.');

  return {
    success: true,
    message: 'Admin password updated successfully.'
  };
});
