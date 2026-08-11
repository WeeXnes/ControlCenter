import { environment } from '~/core/globals';
import { saveJsonFile, loadJsonFile } from '~/util/jsonLoader';
import bcrypt from 'bcryptjs';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  if (!environment.settings || !environment.settings.jwt_secret) {
    loadJsonFile();
  }

  if (environment.settings?.onboarded) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Admin setup is already completed.'
    });
  }

  const { password } = await readBody(event);

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password must be at least 6 characters long.'
    });
  }

  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);

  environment.settings.password_hash = hash;
  environment.settings.onboarded = true;
  saveJsonFile();

  return { success: true, message: 'Admin password set successfully.' };
});
