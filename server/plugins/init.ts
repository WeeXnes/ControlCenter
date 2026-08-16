import { loadJsonFile } from '~/util/jsonLoader';
import { ensureSelfSignedCert } from '~/server/util/certManager';

export default defineNitroPlugin(() => {
  console.log('[ControlCenter] Initializing settings storage...');
  loadJsonFile();

  const certs = ensureSelfSignedCert();
  if (certs) {
    console.log(`[ControlCenter] Server SSL SHA-256 Fingerprint: ${certs.fingerprint}`);
  }
});
