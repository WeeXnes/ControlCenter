import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';
import { getCertFingerprint } from '~/server/util/certManager';
import jwt from 'jsonwebtoken';

export default defineEventHandler((event) => {
  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  const onboarded = environment.settings?.onboarded ?? false;
  
  const cookies = parseCookies(event);
  let authenticated = false;
  let token = cookies.token;

  if (!token) {
    const authHeader = getRequestHeader(event, 'authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, environment.jwt_globals.secret) as any;
      authenticated = !decoded.isPartial;
    } catch {
      authenticated = false;
    }
  }

  const isHttps = getRequestProtocol(event) === 'https' || getRequestHeader(event, 'x-forwarded-proto') === 'https';

  return {
    onboarded,
    authenticated,
    twoFactorEnabled: !!environment.settings?.two_factor_enabled,
    certFingerprint: getCertFingerprint(),
    httpsEnabled: isHttps
  };
});
