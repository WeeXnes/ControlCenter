import { loadJsonFile } from '~/util/jsonLoader';

export default defineNitroPlugin(() => {
  console.log('[ControlCenter] Initializing settings storage...');
  loadJsonFile();
});
