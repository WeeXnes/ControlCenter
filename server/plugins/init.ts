import { loadJsonFile } from '~/util/jsonLoader';
import { ensureSelfSignedCert } from '~/server/util/certManager';
import { getDefaultKeyName, generateSshKeyPair } from '~/server/util/sshKeyManager';

export default defineNitroPlugin(() => {
  console.log('[ControlCenter] Initializing settings storage...');
  loadJsonFile();

  const certs = ensureSelfSignedCert();
  if (certs) {
    console.log(`[ControlCenter] Server SSL SHA-256 Fingerprint: ${certs.fingerprint}`);
  }

  const defaultKey = getDefaultKeyName();
  if (!defaultKey) {
    try {
      const key = generateSshKeyPair('default');
      console.log(`[ControlCenter] Automatically initialized default ed25519 SSH keypair: ${key.filename}`);
    } catch (err: any) {
      console.warn(`[ControlCenter] Could not auto-generate default SSH key: ${err.message}`);
    }
  } else {
    console.log(`[ControlCenter] Default SSH Key ready: ${defaultKey}`);
  }
});
