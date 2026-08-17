import { defineEventHandler, createError, readBody, assertMethod } from 'h3';
import { createRequire } from 'module';
import { environment } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';

const require = createRequire(import.meta.url);
const otplib = require('otplib');
const authenticator = otplib.authenticator || otplib;

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const body = await readBody(event).catch(() => ({}));
  const { code } = body || {};

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: '2FA code is required to disable Two-Factor Authentication.'
    });
  }

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  if (environment.settings.two_factor_enabled && environment.settings.two_factor_secret) {
    const cleanCode = String(code).replace(/\s/g, '');
    let isValid = false;

    try {
      if (typeof authenticator.verify === 'function') {
        const res: any = authenticator.verify({
          token: cleanCode,
          secret: environment.settings.two_factor_secret
        });
        isValid = res === true || (res && res.valid === true);
      } else if (typeof authenticator.check === 'function') {
        const res: any = authenticator.check(
          cleanCode,
          environment.settings.two_factor_secret
        );
        isValid = res === true || (res && res.valid === true);
      }
    } catch (err: any) {
      console.error('[2FA] Disable verification error:', err.message);
      isValid = false;
    }

    if (!isValid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid 2FA code.'
      });
    }
  }

  environment.settings.two_factor_secret = null;
  environment.settings.two_factor_enabled = false;
  saveJsonFile();

  console.log('[2FA] Two-Factor Authentication disabled.');

  return {
    success: true,
    message: 'Two-Factor Authentication has been disabled.'
  };
});
