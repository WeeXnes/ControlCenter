import { defineEventHandler, createError } from 'h3';
import { createRequire } from 'module';
import QRCode from 'qrcode';
import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

const require = createRequire(import.meta.url);
const otplib = require('otplib');
const authenticator = otplib.authenticator || otplib;

export default defineEventHandler(async (event) => {
  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  if (environment.settings.two_factor_enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: '2FA is already enabled. Disable it first to re-setup.'
    });
  }

  const service = 'ControlCenter';
  const username = 'admin';
  const secret = authenticator.generateSecret();

  const otpauth = typeof authenticator.keyuri === 'function'
    ? authenticator.keyuri(username, service, secret)
    : `otpauth://totp/${encodeURIComponent(service)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(service)}`;

  const qrCodeUrl = await QRCode.toDataURL(otpauth);

  return {
    secret,
    qrCodeUrl
  };
});
