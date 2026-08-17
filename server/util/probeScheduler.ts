import { environment, type NodeService } from '~/core/globals';
import { loadJsonFile, saveJsonFile } from '~/util/jsonLoader';
import { executeProbe } from './probeHelper';

let isRunning = false;
let schedulerTimer: NodeJS.Timeout | null = null;
let activeProbesCount = 0;
const MAX_CONCURRENT_PROBES = 10;
let isDirty = false;
let saveDebounceTimer: NodeJS.Timeout | null = null;

function requestSave() {
  isDirty = true;
  if (!saveDebounceTimer) {
    saveDebounceTimer = setTimeout(() => {
      if (isDirty) {
        saveJsonFile();
        isDirty = false;
      }
      saveDebounceTimer = null;
    }, 5000);
  }
}

export async function tickProbes() {
  if (!environment.settings?.infrastructure?.nodeServices) {
    return;
  }

  const infra = environment.settings.infrastructure;
  const now = Date.now();

  for (const [nodeId, services] of Object.entries(infra.nodeServices)) {
    if (!Array.isArray(services)) continue;

    // Check if the node itself is disabled
    if (infra.disabledNodes?.includes(nodeId)) continue;

    // Resolve target host
    const machine = environment.settings.machines?.find((m) => m.id === nodeId);
    const device = infra.devices?.find((d) => d.id === nodeId);
    const targetHost = machine?.ip || device?.ip || '127.0.0.1';

    for (const srv of services) {
      if (activeProbesCount >= MAX_CONCURRENT_PROBES) {
        break; // Throttle concurrent probes
      }

      // Interval in ms (0 = disabled/manual only, default = 15s)
      const intervalSec = srv.probeIntervalSeconds !== undefined ? srv.probeIntervalSeconds : 15;
      if (intervalSec <= 0) continue;

      const intervalMs = intervalSec * 1000;
      const lastTime = srv.lastChecked ? new Date(srv.lastChecked).getTime() : 0;

      if (now - lastTime >= intervalMs) {
        // Probe is due!
        activeProbesCount++;
        // Set lastChecked immediately to prevent duplicate runs in next tick
        srv.lastChecked = new Date(now).toISOString();

        executeProbe(targetHost, srv.port, 2500)
          .then((res) => {
            const newStatus = res.reachable ? 'online' : 'offline';
            const statusChanged = srv.status !== newStatus;
            srv.status = newStatus;
            srv.latencyMs = res.latencyMs;
            srv.lastChecked = new Date().toISOString();
            if (statusChanged) {
              requestSave();
            }
          })
          .catch(() => {
            srv.status = 'offline';
            srv.latencyMs = -1;
            srv.lastChecked = new Date().toISOString();
          })
          .finally(() => {
            activeProbesCount = Math.max(0, activeProbesCount - 1);
          });
      }
    }
  }
}

export function startProbeScheduler() {
  if (isRunning) return;
  isRunning = true;

  console.log('[ProbeScheduler] Starting background reachability prober...');
  
  // Initial check after 2 seconds
  setTimeout(tickProbes, 2000);

  // Poll loop every 3 seconds
  schedulerTimer = setInterval(tickProbes, 3000);
}

export function stopProbeScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  if (isDirty) {
    saveJsonFile();
    isDirty = false;
  }
  isRunning = false;
}
