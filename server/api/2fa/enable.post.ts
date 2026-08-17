import { defineEventHandler, createError, readBody, assertMethod } from 'h3';
import { createRequire } from 'module';
import { environment } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';

const require = createRequire(import.meta.url);
const otplib = require('otplib');

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const body = await readBody(event).catch(() => ({}));
  const { secret, code } = body || {};

  if (!secret || !code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Secret and verification code are required.'
    });
  }

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const cleanCode = String(code).replace(/\s/g, '');

  let isValid = false;
  try {
    const res = await otplib.verify({
      token: cleanCode,
      secret,
      epochTolerance: 60
    });
    isValid = res === true || (res && res.valid === true);
  } catch (err: any) {
    console.error('[2FA] Enable verification error:', err.message);
    isValid = false;
  }

  if (!isValid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid verification code.'
    });
  }

  environment.settings.two_factor_secret = secret;
  environment.settings.two_factor_enabled = true;
  saveJsonFile();

  console.log('[2FA] Successfully enabled Two-Factor Authentication.');

  return {
    success: true,
    message: 'Two-Factor Authentication has been successfully enabled.'
  };
});
