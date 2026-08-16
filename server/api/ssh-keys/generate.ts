import { generateSshKeyPair } from '~/server/util/sshKeyManager';

export default defineEventHandler(async (event) => {
  assertMethod(event, 'POST');

  const body = await readBody(event).catch(() => ({}));
  const name = body?.name ? String(body.name).trim() : 'default';

  try {
    const key = generateSshKeyPair(name);
    return {
      success: true,
      filename: key.filename,
      publicKey: key.publicKey,
      message: `Generated and configured SSH keypair "${key.filename}" successfully.`
    };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to generate SSH key pair: ${err.message}`
    });
  }
});
