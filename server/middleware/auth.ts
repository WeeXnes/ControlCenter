import jwt from 'jsonwebtoken';
import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

export default defineEventHandler((event) => {
  const path = getRequestPath(event);

  // Allow static assets and non-API requests
  if (!path.startsWith('/api')) {
    return;
  }

  // Ensure settings are loaded
  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  // Public API endpoints that don't require auth token
  const publicPaths = ['/api/auth/login', '/api/auth/setup', '/api/auth/status'];
  if (publicPaths.includes(path)) {
    return;
  }

  // Check for JWT token in cookie or Authorization header
  const cookies = parseCookies(event);
  let token = cookies.token;

  if (!token) {
    const authHeader = getRequestHeader(event, 'authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Authentication token missing'
    });
  }

  try {
    const decoded = jwt.verify(token, environment.jwt_globals.secret);
    event.context.auth = decoded;
  } catch (err) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid or expired authentication token'
    });
  }
});
