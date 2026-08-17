<template>
  <aside 
    v-if="node"
    class="w-80 md:w-96 bg-base-200/95 backdrop-blur-2xl border-l border-base-content/10 flex flex-col h-full shadow-2xl z-30 transition-all duration-300 overflow-hidden"
  >
    <!-- Header -->
    <div class="p-4 border-b border-base-content/10 flex items-start justify-between gap-2">
      <div class="flex items-center gap-3 min-w-0">
        <div 
          class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
          :class="getNodeBadgeClass()"
        >
          <Icon :name="getNodeIcon()" size="22" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-sm text-base-content truncate">{{ node.name }}</h3>
            <span 
              v-if="node.type === 'machine'"
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="node.online ? 'bg-success animate-ping' : 'bg-error'"
            ></span>
          </div>
          <p class="text-[11px] font-mono text-base-content/60 truncate">
            {{ node.ip || node.cidr || 'Virtual Node' }}
          </p>
        </div>
      </div>

      <button @click="$emit('close')" class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-base-content">
        <Icon name="material-symbols:close-rounded" size="18" />
      </button>
    </div>

    <!-- Scrollable Content Body -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-medium">
      <!-- Quick Specs Card for ControlCenter Machines -->
      <div v-if="node.type === 'machine'" class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <div class="p-2.5 rounded-lg bg-base-100/70 border border-base-content/5 space-y-1">
            <span class="text-[10px] text-base-content/50 uppercase font-bold">Status</span>
            <div class="flex items-center gap-1.5 font-bold" :class="node.online ? 'text-success' : 'text-error'">
              <span class="w-2 h-2 rounded-full" :class="node.online ? 'bg-success' : 'bg-error'"></span>
              {{ node.online ? 'Connected (WSS)' : 'Offline' }}
            </div>
          </div>

          <div class="p-2.5 rounded-lg bg-base-100/70 border border-base-content/5 space-y-1">
            <span class="text-[10px] text-base-content/50 uppercase font-bold">Operating System</span>
            <div class="font-bold text-base-content/90 truncate">{{ node.telemetry?.os || 'Linux OS' }}</div>
          </div>

          <div class="p-2.5 rounded-lg bg-base-100/70 border border-base-content/5 space-y-1">
            <span class="text-[10px] text-base-content/50 uppercase font-bold">CPU Usage</span>
            <div class="font-bold text-primary">{{ node.telemetry?.cpuUsagePercent ?? 0 }}%</div>
          </div>

          <div class="p-2.5 rounded-lg bg-base-100/70 border border-base-content/5 space-y-1">
            <span class="text-[10px] text-base-content/50 uppercase font-bold">RAM Usage</span>
            <div class="font-bold text-secondary">{{ node.telemetry?.ramUsagePercent ?? 0 }}%</div>
          </div>
        </div>

        <!-- Network Interfaces & IP Addresses -->
        <div v-if="node.ipAddresses && node.ipAddresses.length > 1" class="p-2.5 rounded-lg bg-base-100/70 border border-base-content/5 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] text-base-content/50 uppercase font-bold">
            <span>Network Interfaces</span>
            <span class="font-mono text-primary font-bold">{{ node.ipAddresses.length }} IPs</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="ip in node.ipAddresses" 
              :key="ip"
              class="px-2 py-0.5 rounded bg-base-200/80 border border-base-content/10 font-mono text-[10px] text-base-content/80"
            >
              {{ ip }}
            </span>
          </div>
        </div>

        <button 
          @click="openSshTerminal"
          class="btn btn-primary btn-sm w-full rounded-lg shadow font-semibold gap-1.5 text-xs"
        >
          <Icon name="material-symbols:terminal-rounded" size="16" />
          Launch Interactive SSH Shell
        </button>
      </div>

      <!-- Specs Card for Router / Subnet Devices -->
      <div v-else-if="node.type !== 'service'" class="p-3 rounded-lg bg-base-100/70 border border-base-content/5 space-y-2">
        <div class="flex justify-between items-center text-[11px]">
          <span class="text-base-content/50">Device Type</span>
          <span class="font-bold uppercase text-primary">{{ node.type }}</span>
        </div>
        <div v-if="node.cidr" class="flex justify-between items-center text-[11px]">
          <span class="text-base-content/50">Subnet CIDR</span>
          <span class="font-mono font-bold text-base-content">{{ node.cidr }}</span>
        </div>
        <div v-if="node.description" class="text-[11px] text-base-content/70 pt-1 border-t border-base-content/5">
          {{ node.description }}
        </div>
      </div>

      <!-- Canvas Star Graph Visibility Card -->
      <div v-if="node.type !== 'service'" class="p-2.5 rounded-lg bg-base-100/70 border border-base-content/5 flex items-center justify-between">
        <div class="flex items-center gap-2 min-w-0">
          <Icon 
            :name="node.disabledInGraph ? 'material-symbols:visibility-off-outline-rounded' : 'material-symbols:visibility-outline-rounded'" 
            size="16" 
            :class="node.disabledInGraph ? 'text-base-content/40' : 'text-primary'" 
          />
          <div>
            <div class="text-[11px] font-bold text-base-content">Topology Star Graph</div>
            <div class="text-[10px] text-base-content/50">
              {{ node.disabledInGraph ? 'Hidden from graph' : 'Rendered in graph' }}
            </div>
          </div>
        </div>
        <input 
          type="checkbox" 
          class="toggle toggle-xs toggle-primary" 
          :checked="!node.disabledInGraph"
          @change="toggleGraphVisibility"
        />
      </div>

      <!-- Attached Services Section -->
      <div v-if="node.type !== 'service'" class="space-y-3 pt-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <Icon name="material-symbols:layers-outline-rounded" size="16" class="text-primary" />
            <span class="font-bold text-base-content/90">Attached Services &amp; Ports</span>
          </div>
          <button 
            @click="showAddServiceForm = !showAddServiceForm" 
            class="btn btn-ghost btn-xs text-primary hover:bg-primary/10 gap-1 rounded-md"
          >
            <Icon :name="showAddServiceForm ? 'material-symbols:expand-less-rounded' : 'material-symbols:add-rounded'" size="14" />
            {{ showAddServiceForm ? 'Cancel' : 'Add Port' }}
          </button>
        </div>

        <!-- Add Service Form -->
        <form v-if="showAddServiceForm" @submit.prevent="handleAddService" class="p-3 rounded-lg bg-base-100 border border-primary/20 space-y-2.5 shadow-sm">
          <div class="form-control">
            <input 
              v-model="newService.name"
              type="text" 
              required 
              placeholder="Service Name (e.g. WebServer1, Plex, Vaultwarden)" 
              class="input input-xs rounded-md bg-base-200/80 border-base-content/10 focus:border-primary text-xs"
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="form-control">
              <input 
                v-model="newService.port"
                type="number" 
                min="1" 
                max="65535" 
                required 
                placeholder="Port (e.g. 1337)" 
                class="input input-xs rounded-md bg-base-200/80 border-base-content/10 focus:border-primary font-mono text-xs"
              />
            </div>

            <div class="form-control">
              <select 
                v-model="newService.protocol" 
                class="select select-xs rounded-md bg-base-200/80 border-base-content/10 focus:border-primary text-xs"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="ssh">SSH</option>
                <option value="custom">CUSTOM</option>
              </select>
            </div>
          </div>

          <div class="form-control">
            <input 
              v-model="newService.publicUrl"
              type="text" 
              placeholder="Public / Domain URL (e.g. https://plex.example.com)" 
              class="input input-xs rounded-md bg-base-200/80 border-base-content/10 focus:border-primary font-mono text-xs"
            />
          </div>

          <div class="flex justify-end gap-1.5 pt-1">
            <button type="submit" class="btn btn-primary btn-xs rounded-md font-semibold gap-1" :disabled="addingService">
              <span v-if="addingService" class="loading loading-spinner loading-xs"></span>
              <Icon v-else name="material-symbols:check-rounded" size="14" />
              Save Service
            </button>
          </div>
        </form>

        <!-- Empty State -->
        <div v-if="!services || services.length === 0" class="p-3 text-center rounded-lg bg-base-100/40 border border-base-content/5 text-base-content/50 text-[11px]">
          No ports or services registered for this node.
        </div>

        <!-- Services List -->
        <div v-else class="space-y-2">
          <div 
            v-for="srv in services" 
            :key="srv.id"
            class="p-2.5 rounded-lg bg-base-100 border border-base-content/10 space-y-1.5 hover:border-base-content/20 transition-all shadow-sm"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <!-- Live Reachability Indicator Dot -->
                <span 
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors"
                  :class="getReachabilityDotClass(srv)"
                  :title="srv.status || 'unknown'"
                ></span>
                <div>
                  <span class="font-bold text-xs text-base-content">{{ srv.name }}</span>
                  <span class="text-[10px] font-mono text-primary font-semibold ml-1.5">@:{{ srv.port }}</span>
                </div>
              </div>

              <div class="flex items-center gap-1">
                <span class="badge badge-xs font-mono font-bold uppercase" :class="getProtocolBadgeClass(srv.protocol)">
                  {{ srv.protocol }}
                </span>

                <button 
                  @click="deleteService(srv.id)" 
                  class="btn btn-ghost btn-xs btn-square text-error/60 hover:text-error hover:bg-error/10 rounded"
                  title="Remove Service"
                >
                  <Icon name="material-symbols:delete-outline-rounded" size="13" />
                </button>
              </div>
            </div>

            <!-- Public URL Badge if set -->
            <div v-if="srv.publicUrl" class="text-[10px] flex items-center gap-1 text-primary hover:underline truncate">
              <Icon name="material-symbols:public-rounded" size="12" class="flex-shrink-0" />
              <a :href="srv.publicUrl" target="_blank" rel="noopener noreferrer" class="truncate font-mono">
                {{ srv.publicUrl }}
              </a>
            </div>

            <!-- Reachability Stats & Action Bar -->
            <div class="flex items-center justify-between text-[10px] pt-1 border-t border-base-content/5 text-base-content/60">
              <span v-if="srv.latencyMs !== undefined && srv.latencyMs >= 0" class="font-mono text-success">
                {{ srv.latencyMs }}ms latency
              </span>
              <span v-else-if="srv.status === 'offline'" class="font-mono text-error">
                Port unreachable
              </span>
              <span v-else class="text-base-content/40">
                Not tested
              </span>

              <div class="flex items-center gap-1.5">
                <button 
                  v-if="srv.publicUrl || (['http', 'https'].includes(srv.protocol) && (node.ip || srv.host))"
                  @click="openInBrowser(srv)"
                  class="btn btn-ghost btn-xs text-primary gap-0.5 p-0.5 h-auto min-h-0 text-[10px]"
                >
                  <Icon name="material-symbols:open-in-new-rounded" size="12" />
                  Open
                </button>

                <button 
                  @click="testProbe(srv)"
                  class="btn btn-ghost btn-xs text-base-content/80 hover:text-primary gap-0.5 p-0.5 h-auto min-h-0 text-[10px]"
                  :disabled="probingId === srv.id"
                >
                  <span v-if="probingId === srv.id" class="loading loading-spinner loading-xs"></span>
                  <Icon v-else name="material-symbols:network-ping-rounded" size="12" />
                  Test Probe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons for Custom Devices -->
      <div v-if="node.type !== 'machine' && node.type !== 'service'" class="pt-3 space-y-2 border-t border-base-content/10">
        <button 
          @click="$emit('edit-device', node)"
          class="btn btn-outline btn-sm w-full rounded-lg text-xs gap-1.5 font-semibold"
        >
          <Icon name="material-symbols:edit-outline-rounded" size="15" />
          Edit Device Properties
        </button>

        <button 
          @click="deleteDevice"
          class="btn btn-ghost btn-sm text-error hover:bg-error/10 w-full rounded-lg text-xs gap-1.5 font-semibold"
        >
          <Icon name="material-symbols:delete-outline-rounded" size="15" />
          Remove from Topology
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  node: any
  servicesMap?: Record<string, any[]>
}>()

const emit = defineEmits(['close', 'edit-device', 'refresh-graph'])
const router = useRouter()

const showAddServiceForm = ref(false)
const addingService = ref(false)
const probingId = ref<string | null>(null)

const newService = reactive({
  name: '',
  port: 80,
  protocol: 'http',
  path: '/',
  publicUrl: ''
})

const services = computed(() => {
  if (!props.node) return []
  return props.servicesMap?.[props.node.id] || props.node.services || []
})

const getNodeIcon = () => {
  switch (props.node.type) {
    case 'machine': return 'material-symbols:computer-outline-rounded'
    case 'router': return 'material-symbols:router-outline-rounded'
    case 'switch': return 'material-symbols:hub-outline-rounded'
    case 'subnet': return 'material-symbols:lan-outline-rounded'
    case 'firewall': return 'material-symbols:shield-lock-outline-rounded'
    case 'service': return 'material-symbols:layers-outline-rounded'
    default: return 'material-symbols:device-hub-rounded'
  }
}

const getNodeBadgeClass = () => {
  switch (props.node.type) {
    case 'machine': return 'bg-primary/10 text-primary border-primary/20'
    case 'router': return 'bg-warning/10 text-warning border-warning/20'
    case 'switch': return 'bg-secondary/10 text-secondary border-secondary/20'
    case 'subnet': return 'bg-accent/10 text-accent border-accent/20'
    default: return 'bg-base-300 text-base-content border-base-content/10'
  }
}

const getProtocolBadgeClass = (proto: string) => {
  switch (proto?.toLowerCase()) {
    case 'https': return 'badge-success text-success-content'
    case 'http': return 'badge-primary text-primary-content'
    case 'ssh': return 'badge-secondary text-secondary-content'
    case 'tcp': return 'badge-accent text-accent-content'
    default: return 'badge-neutral'
  }
}

const getReachabilityDotClass = (srv: any) => {
  if (probingId.value === srv.id) return 'bg-warning animate-pulse'
  if (srv.status === 'online') return 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.8)]'
  if (srv.status === 'offline') return 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.8)]'
  return 'bg-base-content/30'
}

const openSshTerminal = () => {
  router.push({ path: '/', query: { machine: props.node.id, tab: 'terminal' } })
}

const toggleGraphVisibility = async () => {
  const newDisabled = !props.node.disabledInGraph
  props.node.disabledInGraph = newDisabled
  try {
    await $fetch('/api/infrastructure/toggle', {
      method: 'POST',
      body: {
        nodeId: props.node.id,
        disabled: newDisabled
      }
    })
    emit('refresh-graph')
  } catch (err: any) {
    props.node.disabledInGraph = !newDisabled
    alert(`Failed to toggle graph visibility: ${err.message}`)
  }
}

const openInBrowser = (srv: any) => {
  if (srv.publicUrl) {
    let url = srv.publicUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }
    window.open(url, '_blank')
    return
  }
  const host = props.node.ip || 'localhost'
  const url = `${srv.protocol}://${host}:${srv.port}${srv.path || ''}`
  window.open(url, '_blank')
}

const handleAddService = async () => {
  addingService.value = true
  try {
    await $fetch('/api/infrastructure/services', {
      method: 'POST',
      body: {
        nodeId: props.node.id,
        ...newService
      }
    })
    newService.name = ''
    newService.port = 80
    newService.publicUrl = ''
    showAddServiceForm.value = false
    emit('refresh-graph')
  } catch (err: any) {
    alert(`Failed to add service: ${err.message}`)
  } finally {
    addingService.value = false
  }
}

const deleteService = async (serviceId: string) => {
  if (!confirm('Are you sure you want to remove this service port?')) return
  try {
    await $fetch('/api/infrastructure/services', {
      method: 'DELETE',
      query: { nodeId: props.node.id, serviceId }
    })
    emit('refresh-graph')
  } catch (err: any) {
    alert(`Failed to delete service: ${err.message}`)
  }
}

const testProbe = async (srv: any) => {
  probingId.value = srv.id
  srv.status = 'checking'
  try {
    const res = await $fetch<any>('/api/infrastructure/probe', {
      method: 'POST',
      body: {
        nodeId: props.node.id,
        serviceId: srv.id,
        host: props.node.ip || '127.0.0.1',
        port: srv.port,
        protocol: srv.protocol
      }
    })
    srv.status = res.reachable ? 'online' : 'offline'
    srv.latencyMs = res.latencyMs
  } catch {
    srv.status = 'offline'
    srv.latencyMs = -1
  } finally {
    probingId.value = null
  }
}

const autoProbeUnchecked = () => {
  if (!services.value) return
  for (const srv of services.value) {
    if (srv.status === 'unknown' || !srv.status) {
      testProbe(srv)
    }
  }
}

watch(() => props.node?.id, () => {
  autoProbeUnchecked()
}, { immediate: true })

const deleteDevice = async () => {
  if (!confirm(`Are you sure you want to remove "${props.node.name}" from your infrastructure?`)) return
  try {
    await $fetch('/api/infrastructure', {
      method: 'DELETE',
      query: { id: props.node.id }
    })
    emit('close')
    emit('refresh-graph')
  } catch (err: any) {
    alert(`Failed to delete device: ${err.message}`)
  }
}
</script>
