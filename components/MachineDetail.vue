<template>
  <div class="flex-1 flex flex-col space-y-5">
    <!-- Top Header Banner -->
    <div class="card bg-base-200/70 border border-base-content/10 backdrop-blur-xl p-5 rounded-xl shadow-lg relative overflow-hidden">
      <!-- Glow decoration -->
      <div class="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <!-- Left Host Title & Specs -->
        <div class="space-y-2">
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-2xl font-bold tracking-tight text-base-content">{{ machine.name }}</h1>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border"
                  :class="telemetry?.online ? 'bg-success/10 text-success border-success/30' : 'bg-error/10 text-error border-error/30'">
              <span class="w-2 h-2 rounded-full" :class="telemetry?.online ? 'bg-success animate-ping' : 'bg-error'"></span>
              {{ telemetry?.online ? 'Secure WSS Connected' : 'Daemon Offline' }}
            </span>
            <span class="font-mono text-xs px-2 py-0.5 rounded bg-base-300/70 text-base-content/70">
              IP: {{ machine.ip }}
            </span>
          </div>

          <div class="flex items-center gap-4 text-xs font-medium text-base-content/60 flex-wrap">
            <span class="flex items-center gap-1.5">
              <Icon name="material-symbols:shield-lock-outline-rounded" size="16" class="text-primary" />
              Zero Open Inbound Ports
            </span>
            <span class="flex items-center gap-1.5">
              <Icon name="material-symbols:computer-outline-rounded" size="16" class="text-secondary" />
              {{ telemetry?.os || 'Linux OS' }}
            </span>
            <span class="flex items-center gap-1.5">
              <Icon name="material-symbols:developer-board-outline-rounded" size="16" class="text-secondary" />
              {{ telemetry?.cpuModel || 'CPU' }} ({{ telemetry?.cpuCores || 1 }} Cores)
            </span>
            <span class="flex items-center gap-1.5">
              <Icon name="material-symbols:schedule-rounded" size="16" class="text-accent" />
              Uptime: {{ formatUptime(telemetry?.uptimeSeconds || 0) }}
            </span>
          </div>
        </div>

        <!-- Right Quick Action Buttons -->
        <div class="flex items-center gap-2 flex-wrap">
          <button 
            @click="setTab('terminal')" 
            class="btn btn-primary btn-sm rounded-lg shadow-md shadow-primary/20 hover:scale-[1.02] transition-all gap-1.5 text-xs font-semibold"
          >
            <Icon name="material-symbols:terminal-rounded" size="16" />
            SSH Terminal
          </button>
          
          <button 
            @click="confirmAction('restart')" 
            class="btn btn-outline btn-warning btn-sm rounded-lg hover:scale-[1.02] transition-all gap-1.5 text-xs font-semibold"
          >
            <Icon name="material-symbols:restart-alt-rounded" size="16" />
            Restart
          </button>

          <button 
            @click="confirmAction('shutdown')" 
            class="btn btn-outline btn-error btn-sm rounded-lg hover:scale-[1.02] transition-all gap-1.5 text-xs font-semibold"
          >
            <Icon name="material-symbols:power-settings-new-rounded" size="16" />
            Shutdown
          </button>

          <button 
            @click="$emit('edit-machine', machine)" 
            class="btn btn-ghost btn-sm btn-square rounded-lg hover:bg-base-content/10"
            title="Edit Machine Settings"
          >
            <Icon name="material-symbols:edit-rounded" size="16" />
          </button>

          <button 
            @click="$emit('delete-machine', machine.id)" 
            class="btn btn-ghost btn-sm btn-square rounded-lg hover:bg-error/10 text-error"
            title="Delete Machine"
          >
            <Icon name="material-symbols:delete-outline-rounded" size="16" />
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 mt-4 pt-3 border-t border-base-content/5">
        <button 
          @click="setTab('telemetry')"
          class="btn btn-sm rounded-lg transition-all gap-1.5 text-xs font-semibold"
          :class="activeTab === 'telemetry' ? 'btn-primary' : 'btn-ghost hover:bg-base-content/5'"
        >
          <Icon name="material-symbols:monitoring-rounded" size="16" />
          Performance Telemetry
        </button>

        <button 
          @click="setTab('terminal')"
          class="btn btn-sm rounded-lg transition-all gap-1.5 text-xs font-semibold"
          :class="activeTab === 'terminal' ? 'btn-primary' : 'btn-ghost hover:bg-base-content/5'"
        >
          <Icon name="material-symbols:terminal-rounded" size="16" />
          SSH Shell
        </button>

        <button 
          @click="setTab('info')"
          class="btn btn-sm rounded-lg transition-all gap-1.5 text-xs font-semibold"
          :class="activeTab === 'info' ? 'btn-primary' : 'btn-ghost hover:bg-base-content/5'"
        >
          <Icon name="material-symbols:info-outline-rounded" size="16" />
          System Information
        </button>
      </div>
    </div>

    <!-- Tab 1: Telemetry Gauges & Hardware Cards -->
    <div v-if="activeTab === 'telemetry'" class="space-y-5">
      <!-- Usage Gauges Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <UsageGauge 
          title="CPU Usage"
          label="Processor Load"
          :percentage="telemetry?.cpuUsagePercent || 0"
          icon="material-symbols:developer-board-outline-rounded"
          color="primary"
          detailLabel="Cores"
          :detailValue="`${telemetry?.cpuCores || 1} Cores`"
        />

        <UsageGauge 
          title="RAM Memory"
          label="RAM Allocated"
          :percentage="telemetry?.ramUsagePercent || 0"
          icon="material-symbols:memory-rounded"
          color="secondary"
          detailLabel="Used / Total"
          :detailValue="formatBytesPair(telemetry?.ramUsedBytes, telemetry?.ramTotalBytes)"
        />

        <UsageGauge 
          title="Disk Storage"
          label="Mount Usage"
          :percentage="telemetry?.diskUsagePercent || 0"
          icon="material-symbols:hard-drive-outline-rounded"
          color="accent"
          detailLabel="Used / Total"
          :detailValue="formatBytesPair(telemetry?.diskUsedBytes, telemetry?.diskTotalBytes)"
        />
      </div>

      <!-- Quick Metrics Summary -->
      <div class="card bg-base-200/50 border border-base-content/10 p-5 rounded-xl space-y-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon name="material-symbols:tune-rounded" size="18" />
          </div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-base-content/80">Host Overview</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div class="p-3 rounded-lg bg-base-100/60 border border-base-content/5 space-y-1">
            <span class="text-base-content/60 font-medium">Hostname</span>
            <p class="font-bold text-sm text-base-content truncate">{{ telemetry?.hostname || machine.name }}</p>
          </div>

          <div class="p-3 rounded-lg bg-base-100/60 border border-base-content/5 space-y-1">
            <span class="text-base-content/60 font-medium">Security Tunnel</span>
            <p class="font-bold text-sm text-primary font-mono truncate">Outbound TLS WSS</p>
          </div>

          <div class="p-3 rounded-lg bg-base-100/60 border border-base-content/5 space-y-1">
            <span class="text-base-content/60 font-medium">SSH User &amp; Port</span>
            <p class="font-bold text-sm text-base-content font-mono truncate">{{ machine.sshUser || 'root' }}@{{ machine.ip }}:{{ machine.sshPort || 22 }}</p>
          </div>

          <div class="p-3 rounded-lg bg-base-100/60 border border-base-content/5 space-y-1">
            <span class="text-base-content/60 font-medium">Last Sync</span>
            <p class="font-bold text-sm text-base-content font-mono">{{ telemetry?.timestamp ? new Date(telemetry.timestamp).toLocaleTimeString() : 'N/A' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Embedded Interactive SSH Terminal -->
    <div v-else-if="activeTab === 'terminal'">
      <SshTerminal 
        :machineId="machine.id"
        :machineName="machine.name"
        :machineIp="machine.ip"
      />
    </div>

    <!-- Tab 3: Detailed System Info -->
    <div v-else-if="activeTab === 'info'" class="card bg-base-200/50 border border-base-content/10 p-5 rounded-xl space-y-4">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Icon name="material-symbols:info-outline-rounded" size="18" />
        </div>
        <h3 class="text-sm font-bold text-base-content">System Specifications</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div class="space-y-2">
          <h4 class="font-bold text-[11px] uppercase tracking-wider text-primary">Hardware &amp; OS</h4>
          <div class="space-y-1.5">
            <div class="flex justify-between py-1.5 border-b border-base-content/5">
              <span class="text-base-content/60">Operating System</span>
              <span class="font-semibold">{{ telemetry?.os || 'Linux' }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-base-content/5">
              <span class="text-base-content/60">CPU Model</span>
              <span class="font-semibold">{{ telemetry?.cpuModel || 'Generic' }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-base-content/5">
              <span class="text-base-content/60">Total RAM</span>
              <span class="font-semibold">{{ formatBytes(telemetry?.ramTotalBytes || 0) }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-base-content/5">
              <span class="text-base-content/60">Total Disk Space</span>
              <span class="font-semibold">{{ formatBytes(telemetry?.diskTotalBytes || 0) }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="font-bold text-[11px] uppercase tracking-wider text-secondary">Network Interfaces</h4>
          <div class="space-y-1.5">
            <div v-for="(ip, idx) in (telemetry?.ipAddresses || [machine.ip])" :key="idx" class="flex justify-between py-1.5 border-b border-base-content/5 font-mono text-xs">
              <span class="text-base-content/60">IPv4 Address #{{ idx + 1 }}</span>
              <span class="font-bold text-primary">{{ ip }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Power Action Confirmation Modal -->
    <div v-if="actionModalOpen" class="modal modal-open backdrop-blur-md">
      <div class="modal-box bg-base-200 border border-base-content/10 rounded-xl p-5 space-y-4 max-w-md">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" :class="pendingAction === 'restart' ? 'bg-warning/15 text-warning' : 'bg-error/15 text-error'">
            <Icon :name="pendingAction === 'restart' ? 'material-symbols:restart-alt-rounded' : 'material-symbols:power-settings-new-rounded'" size="22" />
          </div>
          <div>
            <h3 class="text-base font-bold capitalize">Confirm {{ pendingAction }}</h3>
            <p class="text-xs text-base-content/60 font-medium">Machine: {{ machine.name }} ({{ machine.ip }})</p>
          </div>
        </div>

        <p class="text-xs text-base-content/80 leading-relaxed font-medium">
          Are you sure you want to trigger a <span class="font-bold uppercase text-warning">{{ pendingAction }}</span> on <span class="font-bold text-white">{{ machine.name }}</span>?
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="actionModalOpen = false" class="btn btn-ghost btn-sm rounded-lg">Cancel</button>
          <button 
            @click="executePowerAction" 
            class="btn btn-sm rounded-lg shadow"
            :class="pendingAction === 'restart' ? 'btn-warning' : 'btn-error'"
            :disabled="actionExecuting"
          >
            <span v-if="actionExecuting" class="loading loading-spinner loading-xs"></span>
            Confirm {{ pendingAction }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  machine: any
  telemetry: any
  currentTab?: string
}>()

const emit = defineEmits(['edit-machine', 'delete-machine', 'change-tab'])

const activeTab = computed({
  get: () => (props.currentTab && ['telemetry', 'terminal', 'info'].includes(props.currentTab)) ? props.currentTab as 'telemetry' | 'terminal' | 'info' : 'telemetry',
  set: (val) => emit('change-tab', val)
})

const setTab = (tab: 'telemetry' | 'terminal' | 'info') => {
  emit('change-tab', tab)
}

const actionModalOpen = ref(false)
const pendingAction = ref<'restart' | 'shutdown'>('restart')
const actionExecuting = ref(false)

const confirmAction = (action: 'restart' | 'shutdown') => {
  pendingAction.value = action
  actionModalOpen.value = true
}

const executePowerAction = async () => {
  actionExecuting.value = true
  try {
    await $fetch(`/api/machines/${props.machine.id}/action`, {
      method: 'POST',
      body: { action: pendingAction.value }
    })
    actionModalOpen.value = false
  } catch (err: any) {
    alert(`Action failed: ${err.message}`)
  } finally {
    actionExecuting.value = false
  }
}

const formatUptime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0m'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 GB'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1000) return `${(gb / 1024).toFixed(2)} TB`
  return `${gb.toFixed(1)} GB`
}

const formatBytesPair = (used?: number, total?: number) => {
  if (!total) return '0 GB / 0 GB'
  const usedGb = ((used || 0) / (1024 * 1024 * 1024)).toFixed(1)
  const totalGb = (total / (1024 * 1024 * 1024)).toFixed(1)
  return `${usedGb} GB / ${totalGb} GB`
}
</script>
