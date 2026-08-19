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
              {{ telemetry?.online ? 'WSS Connected' : 'Offline' }}
            </span>
            <!-- Switchable IP Badge -->
            <div v-if="telemetry?.ipAddresses && telemetry.ipAddresses.length > 1" class="dropdown dropdown-bottom">
              <label tabindex="0" class="cursor-pointer font-mono text-xs px-2 py-0.5 rounded bg-base-300/80 hover:bg-base-300 text-base-content/90 border border-base-content/10 flex items-center gap-1 transition-all" title="Click to switch active IP address">
                IP: {{ machine.ip }}
                <Icon name="material-symbols:expand-more-rounded" size="14" class="text-base-content/50" />
              </label>
              <ul tabindex="0" class="dropdown-content z-30 menu p-2 shadow-2xl bg-base-200 border border-base-content/10 rounded-xl w-64 space-y-1 mt-1 text-xs backdrop-blur-xl">
                <li class="menu-title text-[10px] uppercase font-bold text-base-content/50 px-2 py-1 flex justify-between items-center">
                  <span>Switch Used IP Address</span>
                </li>
                <li v-for="detectedIp in telemetry.ipAddresses" :key="detectedIp">
                  <button 
                    @click="switchMachineIp(detectedIp)"
                    class="flex items-center justify-between font-mono py-1.5 px-2 rounded-lg text-xs"
                    :class="detectedIp === machine.ip ? 'active bg-primary text-primary-content font-bold' : 'hover:bg-base-content/5 text-base-content'"
                  >
                    <span>{{ detectedIp }}</span>
                    <span v-if="detectedIp === machine.ip" class="badge badge-xs badge-success font-sans">Active</span>
                  </button>
                </li>
              </ul>
            </div>
            <span v-else class="font-mono text-xs px-2 py-0.5 rounded bg-base-300/70 text-base-content/70">
              IP: {{ machine.ip }}
            </span>
          </div>

          <div class="flex items-center gap-4 text-xs font-medium text-base-content/60 flex-wrap">
            <span class="flex items-center gap-1.5">
              <Icon name="material-symbols:computer-outline-rounded" size="16" class="text-secondary" />
              {{ telemetry?.os || 'Linux' }}
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
            class="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-base-content"
            title="Edit Machine Settings"
          >
            <Icon name="material-symbols:edit-outline-rounded" size="16" />
          </button>

          <button 
            @click="$emit('delete-machine', machine.id)" 
            class="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10"
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

    <!-- Pending Approval Banner -->
    <div v-if="machine.status === 'pending'" class="p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-warning/20 text-warning flex items-center justify-center flex-shrink-0">
          <Icon name="material-symbols:lock-open-rounded" size="20" />
        </div>
        <div>
          <h4 class="font-bold text-sm text-base-content">Device Awaiting Approval</h4>
          <p class="text-xs text-base-content/70">Approve this node to authorize SSH key authentication and activate full remote control.</p>
        </div>
      </div>

      <button 
        @click="approveCurrentMachine" 
        class="btn btn-success btn-sm font-bold text-success-content shadow gap-1 rounded-lg"
        :disabled="approving"
      >
        <span v-if="approving" class="loading loading-spinner loading-xs"></span>
        <Icon v-else name="material-symbols:check-circle-rounded" size="16" />
        Approve Device
      </button>
    </div>

    <!-- Tab 1: Telemetry Gauges & Hardware Cards -->
    <div v-if="activeTab === 'telemetry'" class="space-y-4">
      <!-- View Style Switcher Bar -->
      <div class="flex items-center justify-between gap-4 px-1">
        <div class="flex items-center gap-2">
          <Icon name="material-symbols:analytics-outline-rounded" size="18" class="text-primary" />
          <span class="text-xs font-bold text-base-content/80 uppercase tracking-wider">Performance Monitor</span>
        </div>
        
        <div class="join bg-base-200/90 border border-base-content/10 p-0.5 rounded-lg shadow-sm">
          <button 
            @click="telemetryViewStyle = 'taskmanager'"
            class="join-item btn btn-xs rounded-md transition-all gap-1.5 font-semibold text-xs"
            :class="telemetryViewStyle === 'taskmanager' ? 'btn-primary shadow text-primary-content' : 'btn-ghost text-base-content/70 hover:text-base-content'"
            title="Windows Task Manager Real-Time Charts & Cores Breakdown"
          >
            <Icon name="material-symbols:monitoring-rounded" size="14" />
            Task Manager
          </button>
          
          <button 
            @click="telemetryViewStyle = 'gauges'"
            class="join-item btn btn-xs rounded-md transition-all gap-1.5 font-semibold text-xs"
            :class="telemetryViewStyle === 'gauges' ? 'btn-primary shadow text-primary-content' : 'btn-ghost text-base-content/70 hover:text-base-content'"
            title="Classic Radial Gauges & Overview"
          >
            <Icon name="material-symbols:speed-rounded" size="14" />
            Classic Gauges
          </button>
        </div>
      </div>

      <!-- 1. Task Manager View Mode -->
      <TaskManagerTelemetry 
        v-if="telemetryViewStyle === 'taskmanager'"
        :machine="machine"
        :telemetry="telemetry"
      />

      <!-- 2. Classic Gauges View Mode -->
      <div v-else class="space-y-5">
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
              <span class="text-base-content/60 font-medium">Tunnel</span>
              <p class="font-bold text-sm text-primary font-mono truncate">WSS</p>
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
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-[11px] uppercase tracking-wider text-secondary">Network Interfaces</h4>
            <span class="text-[10px] text-base-content/50 font-mono">{{ (telemetry?.ipAddresses || [machine.ip]).length }} detected</span>
          </div>
          <div class="space-y-1.5">
            <div 
              v-for="(ip, idx) in (telemetry?.ipAddresses || [machine.ip])" 
              :key="idx" 
              class="flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-base-content/5 bg-base-100/50 font-mono text-xs hover:border-base-content/15 transition-all"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-base-content/40 text-[10px]">#{{ idx + 1 }}</span>
                <span class="font-bold truncate" :class="ip === machine.ip ? 'text-primary' : 'text-base-content/90'">{{ ip }}</span>
                <span v-if="ip === machine.ip" class="badge badge-primary badge-xs font-sans font-bold">Active Used IP</span>
              </div>
              <button 
                v-if="ip !== machine.ip"
                @click="switchMachineIp(ip)"
                class="btn btn-ghost btn-xs text-primary hover:bg-primary/10 font-sans gap-1 font-semibold rounded-md"
                :disabled="switchingIp === ip"
                title="Switch active management &amp; SSH IP to this address"
              >
                <span v-if="switchingIp === ip" class="loading loading-spinner loading-xs"></span>
                <Icon v-else name="material-symbols:swap-horiz-rounded" size="14" />
                Set as Used IP
              </button>
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
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  machine: any
  telemetry: any
  currentTab?: string
}>()

const emit = defineEmits(['edit-machine', 'delete-machine', 'change-tab', 'machine-updated'])

const preferredTelemetryCookie = useCookie<'taskmanager' | 'gauges'>('preferred_telemetry_view', {
  default: () => 'taskmanager',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
  path: '/'
})

const telemetryViewStyle = ref<'taskmanager' | 'gauges'>(
  preferredTelemetryCookie.value === 'gauges' || preferredTelemetryCookie.value === 'taskmanager'
    ? preferredTelemetryCookie.value
    : 'taskmanager'
)
const switchingIp = ref<string | null>(null)

const switchMachineIp = async (newIp: string) => {
  if (props.machine.ip === newIp) return
  switchingIp.value = newIp
  try {
    await $fetch(`/api/machines/${props.machine.id}`, {
      method: 'PUT',
      body: { ip: newIp }
    })
    props.machine.ip = newIp
    emit('machine-updated', { ...props.machine, ip: newIp })
  } catch (err: any) {
    alert(`Failed to switch machine IP: ${err.message}`)
  } finally {
    switchingIp.value = null
  }
}

onMounted(() => {
  if (preferredTelemetryCookie.value && (preferredTelemetryCookie.value === 'taskmanager' || preferredTelemetryCookie.value === 'gauges')) {
    telemetryViewStyle.value = preferredTelemetryCookie.value
  } else if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('controlcenter_telemetry_view')
    if (saved === 'taskmanager' || saved === 'gauges') {
      telemetryViewStyle.value = saved
      preferredTelemetryCookie.value = saved
    }
  }
})

watch(telemetryViewStyle, (newVal) => {
  preferredTelemetryCookie.value = newVal
  if (typeof window !== 'undefined') {
    localStorage.setItem('controlcenter_telemetry_view', newVal)
  }
})

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
const approving = ref(false)

const approveCurrentMachine = async () => {
  approving.value = true
  try {
    await $fetch(`/api/machines/${props.machine.id}/approve`, { method: 'POST' })
    props.machine.status = 'approved'
  } catch (err: any) {
    alert(`Failed to approve device: ${err.message}`)
  } finally {
    approving.value = false
  }
}

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
