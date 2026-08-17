<template>
  <div class="space-y-4">
    <!-- Header & Controls Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-base-200/60 p-3.5 rounded-xl border border-base-content/10 backdrop-blur-md">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
          <Icon name="material-symbols:dns-outline-rounded" size="18" />
        </div>
        <div>
          <h3 class="font-bold text-sm text-base-content flex items-center gap-2">
            Device &amp; Network Inventory
            <span class="badge badge-sm badge-ghost text-[10px] font-mono font-bold">{{ allItems.length }} total</span>
          </h3>
          <p class="text-[11px] text-base-content/60">Manage all machines, routers, switches, and graph visibility</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <!-- Search input -->
        <div class="relative flex-1 sm:w-56">
          <Icon name="material-symbols:search-rounded" size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Filter by name, IP, CIDR..." 
            class="input input-xs input-bordered w-full pl-8 rounded-lg text-xs bg-base-100"
          />
        </div>

        <!-- Filter tabs -->
        <div class="join bg-base-100 border border-base-content/10 rounded-lg p-0.5">
          <button 
            @click="filterType = 'all'" 
            class="btn btn-xs join-item rounded-md text-[11px]"
            :class="filterType === 'all' ? 'btn-primary' : 'btn-ghost'"
          >
            All ({{ allItems.length }})
          </button>
          <button 
            @click="filterType = 'machines'" 
            class="btn btn-xs join-item rounded-md text-[11px]"
            :class="filterType === 'machines' ? 'btn-primary' : 'btn-ghost'"
          >
            Machines ({{ machinesCount }})
          </button>
          <button 
            @click="filterType = 'devices'" 
            class="btn btn-xs join-item rounded-md text-[11px]"
            :class="filterType === 'devices' ? 'btn-primary' : 'btn-ghost'"
          >
            Routers/Net ({{ devicesCount }})
          </button>
          <button 
            @click="filterType = 'disabled'" 
            class="btn btn-xs join-item rounded-md text-[11px]"
            :class="filterType === 'disabled' ? 'btn-primary' : 'btn-ghost'"
          >
            Hidden ({{ disabledCount }})
          </button>
        </div>

        <!-- Add Device Button -->
        <button 
          @click="$emit('add-device')" 
          class="btn btn-primary btn-xs rounded-lg font-semibold gap-1 shadow-sm"
        >
          <Icon name="material-symbols:add-rounded" size="14" />
          Add Device
        </button>
      </div>
    </div>

    <!-- Inventory Table -->
    <div class="overflow-x-auto rounded-xl border border-base-content/10 bg-base-200/40 backdrop-blur-md shadow-sm">
      <table class="table table-sm w-full text-xs">
        <thead class="bg-base-300/60 text-base-content/70 uppercase text-[10px] tracking-wider">
          <tr>
            <th>Device / Host</th>
            <th>Type</th>
            <th>IP / Subnet CIDR</th>
            <th>Attached Services</th>
            <th>Live Status</th>
            <th class="text-center">Graph Visibility</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-base-content/5">
          <tr v-if="filteredItems.length === 0">
            <td colspan="7" class="text-center py-8 text-base-content/50">
              <Icon name="material-symbols:search-off-rounded" size="24" class="mx-auto mb-1 opacity-50" />
              No devices match your filter query.
            </td>
          </tr>

          <tr 
            v-for="item in filteredItems" 
            :key="item.id" 
            class="hover:bg-base-100/50 transition-colors group cursor-pointer"
            :class="{ 'bg-primary/5': selectedNodeId === item.id }"
            @click="$emit('select-node', item)"
          >
            <!-- Name & Host -->
            <td>
              <div class="flex items-center gap-2.5 min-w-[160px]">
                <div 
                  class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border"
                  :class="getItemBadgeClass(item)"
                >
                  <Icon :name="getItemIcon(item)" size="15" />
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-base-content truncate flex items-center gap-1.5">
                    {{ item.name }}
                    <span 
                      v-if="item.type === 'machine'" 
                      class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      :class="item.online ? 'bg-success' : 'bg-error'"
                    ></span>
                  </div>
                  <div class="text-[10px] text-base-content/50 truncate font-mono">
                    {{ item.telemetry?.os || item.description || item.id.substring(0, 8) }}
                  </div>
                </div>
              </div>
            </td>

            <!-- Type -->
            <td>
              <span class="badge badge-xs font-mono font-bold uppercase" :class="getTypeBadgeClass(item.type)">
                {{ item.type }}
              </span>
            </td>

            <!-- IP / CIDR -->
            <td>
              <div class="space-y-0.5">
                <div v-if="item.cidr" class="font-mono font-bold text-accent text-[11px]">
                  {{ item.cidr }}
                </div>
                <div v-if="item.ipAddresses && item.ipAddresses.length > 0" class="flex flex-wrap gap-1">
                  <span 
                    v-for="ip in item.ipAddresses" 
                    :key="ip"
                    class="px-1.5 py-0.2 rounded bg-base-100 border border-base-content/10 font-mono text-[10px] text-base-content/80"
                  >
                    {{ ip }}
                  </span>
                </div>
                <div v-else-if="item.ip" class="font-mono text-base-content/80 text-[11px]">
                  {{ item.ip }}
                </div>
                <div v-else-if="!item.cidr" class="text-base-content/40 italic text-[10px]">
                  None
                </div>
              </div>
            </td>

            <!-- Services -->
            <td>
              <div v-if="getServicesForItem(item).length > 0" class="flex flex-wrap gap-1 max-w-xs">
                <span 
                  v-for="srv in getServicesForItem(item)" 
                  :key="srv.id"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-base-100 border border-base-content/10 text-[10px] font-mono"
                  :title="srv.publicUrl || `${srv.protocol}://:${srv.port}`"
                >
                  <span 
                    class="w-1.5 h-1.5 rounded-full"
                    :class="srv.status === 'online' ? 'bg-success' : (srv.status === 'offline' ? 'bg-error' : 'bg-warning')"
                  ></span>
                  <span class="font-semibold text-base-content/90">{{ srv.name }}</span>
                  <span class="text-primary font-bold">@:{{ srv.port }}</span>
                </span>
              </div>
              <span v-else class="text-base-content/30 text-[10px] italic">No services</span>
            </td>

            <!-- Live Status -->
            <td>
              <div v-if="item.type === 'machine'" class="flex items-center gap-1.5">
                <span class="badge badge-xs gap-1 font-semibold" :class="item.online ? 'badge-success' : 'badge-error'">
                  <span class="w-1.5 h-1.5 rounded-full" :class="item.online ? 'bg-success-content' : 'bg-error-content'"></span>
                  {{ item.online ? 'Online' : 'Offline' }}
                </span>
              </div>
              <div v-else class="flex items-center gap-1 text-base-content/60 text-[10px]">
                <Icon name="material-symbols:router-outline-rounded" size="12" class="text-warning" />
                Network Device
              </div>
            </td>

            <!-- Star Graph Visibility Toggle -->
            <td class="text-center" @click.stop>
              <div class="flex items-center justify-center gap-1.5">
                <input 
                  type="checkbox" 
                  class="toggle toggle-xs toggle-primary"
                  :checked="!item.disabledInGraph"
                  @change="handleToggleGraph(item)"
                  :title="item.disabledInGraph ? 'Click to show in Graph' : 'Click to hide from Graph'"
                />
                <span class="text-[10px] font-medium" :class="item.disabledInGraph ? 'text-base-content/40' : 'text-primary'">
                  {{ item.disabledInGraph ? 'Hidden' : 'Visible' }}
                </span>
              </div>
            </td>

            <!-- Action Buttons -->
            <td class="text-right" @click.stop>
              <div class="flex items-center justify-end gap-1">
                <!-- Focus on Canvas Button -->
                <button 
                  @click="$emit('focus-node', item)" 
                  class="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-primary rounded-md"
                  title="Focus in Star Graph"
                >
                  <Icon name="material-symbols:center-focus-weak-rounded" size="14" />
                </button>

                <!-- Inspect Button -->
                <button 
                  @click="$emit('select-node', item)" 
                  class="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-primary rounded-md"
                  title="Inspect Details"
                >
                  <Icon name="material-symbols:info-outline-rounded" size="14" />
                </button>

                <!-- SSH Shell Button (for machines) -->
                <button 
                  v-if="item.type === 'machine'"
                  @click="openSshTerminal(item)" 
                  class="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-primary rounded-md"
                  title="Launch Interactive SSH Shell"
                >
                  <Icon name="material-symbols:terminal-rounded" size="14" />
                </button>

                <!-- Edit Device Button (for custom devices) -->
                <button 
                  v-if="item.type !== 'machine'"
                  @click="$emit('edit-device', item)" 
                  class="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-warning rounded-md"
                  title="Edit Device"
                >
                  <Icon name="material-symbols:edit-outline-rounded" size="14" />
                </button>

                <!-- Delete Device Button (for custom devices) -->
                <button 
                  v-if="item.type !== 'machine'"
                  @click="deleteDevice(item)" 
                  class="btn btn-ghost btn-xs btn-square text-base-content/70 hover:text-error rounded-md"
                  title="Remove Device"
                >
                  <Icon name="material-symbols:delete-outline-rounded" size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  machines: any[]
  devices: any[]
  nodeServices: Record<string, any[]>
  selectedNodeId?: string | null
}>()

const emit = defineEmits([
  'select-node', 
  'focus-node', 
  'add-device', 
  'edit-device', 
  'refresh-graph'
])

const router = useRouter()
const searchQuery = ref('')
const filterType = ref<'all' | 'machines' | 'devices' | 'disabled'>('all')

const allItems = computed(() => {
  return [...(props.devices || []), ...(props.machines || [])]
})

const machinesCount = computed(() => (props.machines || []).length)
const devicesCount = computed(() => (props.devices || []).length)
const disabledCount = computed(() => allItems.value.filter(i => i.disabledInGraph).length)

const filteredItems = computed(() => {
  let list = allItems.value

  if (filterType.value === 'machines') {
    list = list.filter(i => i.type === 'machine')
  } else if (filterType.value === 'devices') {
    list = list.filter(i => i.type !== 'machine')
  } else if (filterType.value === 'disabled') {
    list = list.filter(i => i.disabledInGraph)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(i => {
      const nameMatch = i.name?.toLowerCase().includes(q)
      const ipMatch = i.ip?.toLowerCase().includes(q)
      const cidrMatch = i.cidr?.toLowerCase().includes(q)
      const typeMatch = i.type?.toLowerCase().includes(q)
      const ipsMatch = i.ipAddresses?.some((ip: string) => ip.toLowerCase().includes(q))
      return nameMatch || ipMatch || cidrMatch || typeMatch || ipsMatch
    })
  }

  return list
})

const getServicesForItem = (item: any) => {
  return props.nodeServices?.[item.id] || item.services || []
}

const getItemIcon = (item: any) => {
  switch (item.type) {
    case 'machine': return 'material-symbols:computer-outline-rounded'
    case 'router': return 'material-symbols:router-outline-rounded'
    case 'switch': return 'material-symbols:hub-outline-rounded'
    case 'subnet': return 'material-symbols:lan-outline-rounded'
    case 'firewall': return 'material-symbols:shield-lock-outline-rounded'
    default: return 'material-symbols:device-hub-rounded'
  }
}

const getItemBadgeClass = (item: any) => {
  switch (item.type) {
    case 'machine': return 'bg-primary/10 text-primary border-primary/20'
    case 'router': return 'bg-warning/10 text-warning border-warning/20'
    case 'switch': return 'bg-secondary/10 text-secondary border-secondary/20'
    case 'subnet': return 'bg-accent/10 text-accent border-accent/20'
    default: return 'bg-base-300 text-base-content border-base-content/10'
  }
}

const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case 'machine': return 'badge-primary text-primary-content'
    case 'router': return 'badge-warning text-warning-content'
    case 'switch': return 'badge-secondary text-secondary-content'
    case 'subnet': return 'badge-accent text-accent-content'
    default: return 'badge-neutral'
  }
}

const handleToggleGraph = async (item: any) => {
  const newDisabled = !item.disabledInGraph
  item.disabledInGraph = newDisabled
  try {
    await $fetch('/api/infrastructure/toggle', {
      method: 'POST',
      body: {
        nodeId: item.id,
        disabled: newDisabled
      }
    })
    emit('refresh-graph')
  } catch (err: any) {
    item.disabledInGraph = !newDisabled
    alert(`Failed to toggle graph visibility: ${err.message}`)
  }
}

const openSshTerminal = (item: any) => {
  router.push({ path: '/', query: { machine: item.id, tab: 'terminal' } })
}

const deleteDevice = async (item: any) => {
  if (!confirm(`Are you sure you want to remove "${item.name}" from your infrastructure?`)) return
  try {
    await $fetch('/api/infrastructure', {
      method: 'DELETE',
      query: { id: item.id }
    })
    emit('refresh-graph')
  } catch (err: any) {
    alert(`Failed to delete device: ${err.message}`)
  }
}
</script>
