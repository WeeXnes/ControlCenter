import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

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
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid credentials.'
    });
  }

  const token = jwt.sign({ userId: 'admin' }, environment.jwt_globals.secret, {
    expiresIn: '30d'
  });

  setCookie(event, 'token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  });

  return {
    success: true,
    message: 'Login successful'
  };
});
