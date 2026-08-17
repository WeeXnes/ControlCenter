import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return true;

  // Window is 5 minutes
  if (now - record.firstAttempt > 5 * 60 * 1000) {
    loginAttempts.delete(ip);
    return true;
  }

  // Max 10 failed attempts per 5 minutes
  return record.count < 10;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > 5 * 60 * 1000) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1';

  if (!checkRateLimit(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many failed login attempts. Please wait 5 minutes before trying again.'
    });
  }

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const { password } = await readBody(event);

  if (!password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password is required.'
    });
  }

  if (!environment.settings.onboarded || !environment.settings.password_hash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'System is not set up yet. Please complete initial setup.'
    });
  }

  const isMatch = await bcrypt.compare(password, environment.settings.password_hash);
  if (!isMatch) {
    recordFailedAttempt(ip);
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid credentials.'
    });
  }

  clearAttempts(ip);

  // If Two-Factor Authentication is enabled, issue a short-lived partial token
  if (environment.settings.two_factor_enabled && environment.settings.two_factor_secret) {
    const tempToken = jwt.sign(
      { userId: 'admin', isPartial: true },
      environment.jwt_globals.secret,
      { expiresIn: '5m' }
    );

    return {
      success: true,
      requires2fa: true,
      tempToken,
      message: 'Two-Factor Authentication required'
    };
  }

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

  return {
    success: true,
    message: 'Login successful'
  };
});

