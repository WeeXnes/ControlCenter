import { defineEventHandler, createError, readBody, setCookie, getRequestIP, getRequestProtocol, getRequestHeader, assertMethod } from 'h3';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

const require = createRequire(import.meta.url);
const otplib = require('otplib');

const verifyAttempts = new Map<string, { count: number; firstAttempt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = verifyAttempts.get(ip);
  if (!record) return true;

  // Window is 5 minutes
  if (now - record.firstAttempt > 5 * 60 * 1000) {
    verifyAttempts.delete(ip);
    return true;
  }

  return record.count < 10;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = verifyAttempts.get(ip);
  if (!record || now - record.firstAttempt > 5 * 60 * 1000) {
    verifyAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

function clearAttempts(ip: string) {
  verifyAttempts.delete(ip);
}

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';

  if (!checkRateLimit(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many failed verification attempts. Please wait 5 minutes before trying again.'
    });
  }

  const body = await readBody(event).catch(() => ({}));
  const { tempToken, code } = body || {};

  if (!tempToken || !code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Temporary token and 2FA code are required.'
    });
  }

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  let decoded: any;
  try {
    decoded = jwt.verify(tempToken, environment.jwt_globals.secret);
  } catch (err: any) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired 2FA session token. Please log in again.'
    });
  }

  if (!decoded || !decoded.isPartial) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid token type for 2FA verification.'
    });
  }

  if (!environment.settings.two_factor_enabled || !environment.settings.two_factor_secret) {
    throw createError({
      statusCode: 400,
      statusMessage: '2FA is not enabled on this system.'
    });
  }

  const cleanCode = String(code).replace(/\s/g, '');
  const secret = environment.settings.two_factor_secret;

  let isValid = false;
  try {
    const res = await otplib.verify({
      token: cleanCode,
      secret,
      epochTolerance: 60
    });
    isValid = res === true || (res && res.valid === true);
  } catch (err: any) {
    console.error('[2FA] Login verify exception:', err.message);
    isValid = false;
  }

  if (!isValid) {
    recordFailedAttempt(ip);
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid 2FA verification code.'
    });
  }

  clearAttempts(ip);

  // Issue full 30-day session token
  const token = jwt.sign({ userId: 'admin' }, environment.jwt_globals.secret, {
    expiresIn: '30d'
  });

  const isSecure = getRequestProtocol(event) === 'https' || getRequestHeader(event, 'x-forwarded-proto') === 'https';

  setCookie(event, 'token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  });

  console.log('[2FA] Successful 2FA login verification for admin.');

  return {
    success: true,
    token,
    message: 'Login successful'
  };
});
