<template>
  <aside class="w-full lg:w-80 h-full self-stretch flex flex-col bg-base-200/50 backdrop-blur-xl border border-base-content/10 p-4 rounded-xl space-y-4">
    <!-- Header & Add Button -->
    <div class="flex items-center justify-between px-1">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Icon name="material-symbols:dns-outline-rounded" size="18" />
        </div>
        <h2 class="text-base font-bold tracking-tight">Machines</h2>
      </div>
      <button 
        @click="$emit('open-add-modal')" 
        class="btn btn-primary btn-sm rounded-lg hover:scale-[1.02] transition-all gap-1 text-xs font-semibold"
      >
        <Icon name="material-symbols:add-rounded" size="16" />
        Add Host
      </button>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <Icon name="material-symbols:search-rounded" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Filter machines..."
        class="input input-sm w-full pl-9 rounded-lg bg-base-100/70 border-base-content/10 focus:border-primary text-xs font-medium"
      />
    </div>

    <div class="divider my-0 opacity-20"></div>

    <!-- Machines List -->
    <div class="flex-1 overflow-y-auto space-y-2 pr-0.5">
      <div v-if="filteredMachines.length === 0" class="text-center py-8 px-4 text-base-content/50 space-y-2">
        <Icon name="material-symbols:storage-rounded" size="28" class="opacity-40" />
        <p class="text-xs font-medium">No machines found.</p>
        <button @click="$emit('open-add-modal')" class="btn btn-ghost btn-xs text-primary underline">
          Add host
        </button>
      </div>

      <div
        v-for="machine in filteredMachines"
        :key="machine.id"
        @click="$emit('select-machine', machine.id)"
        class="group p-3 rounded-lg cursor-pointer transition-all duration-150 border flex flex-col space-y-2 relative overflow-hidden"
        :class="[
          selectedId === machine.id 
            ? 'bg-primary/10 border-primary/40 shadow-sm' 
            : 'bg-base-100/40 border-base-content/5 hover:bg-base-100/80 hover:border-base-content/10'
        ]"
      >
        <!-- Active indicator stripe -->
        <div 
          v-if="selectedId === machine.id" 
          class="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"
        ></div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <span class="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span 
                v-if="getMachineStatus(machine.id) === 'online'" 
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"
              ></span>
              <span 
                class="relative inline-flex rounded-full h-2.5 w-2.5"
                :class="{
                  'bg-success': getMachineStatus(machine.id) === 'online',
                  'bg-error': getMachineStatus(machine.id) === 'offline',
                  'bg-warning': getMachineStatus(machine.id) === 'loading'
                }"
              ></span>
            </span>
            <span class="font-bold text-xs tracking-tight truncate group-hover:text-primary transition-colors">
              {{ machine.name }}
            </span>
          </div>

          <span class="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-base-300/60 text-base-content/60">
            {{ machine.ip }}
          </span>
        </div>

        <!-- Quick Stats snippet -->
        <div class="grid grid-cols-2 gap-2 pt-0.5">
          <div class="space-y-1">
            <div class="flex justify-between text-[10px] text-base-content/60 font-medium">
              <span>CPU</span>
              <span class="font-bold">{{ getMachineCpu(machine.id) }}%</span>
            </div>
            <div class="w-full h-1 bg-base-300 rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary transition-all duration-300" 
                :style="{ width: `${getMachineCpu(machine.id)}%` }"
              ></div>
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between text-[10px] text-base-content/60 font-medium">
              <span>RAM</span>
              <span class="font-bold">{{ getMachineRam(machine.id) }}%</span>
            </div>
            <div class="w-full h-1 bg-base-300 rounded-full overflow-hidden">
              <div 
                class="h-full bg-secondary transition-all duration-300" 
                :style="{ width: `${getMachineRam(machine.id)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  machines: any[]
  selectedId: string | null
  telemetryMap: Record<string, any>
}>()

defineEmits(['select-machine', 'open-add-modal'])

const searchQuery = ref('')

const filteredMachines = computed(() => {
  if (!searchQuery.value.trim()) return props.machines
  const q = searchQuery.value.toLowerCase()
  return props.machines.filter(
    m => m.name.toLowerCase().includes(q) || m.ip.toLowerCase().includes(q)
  )
})

const getMachineStatus = (id: string) => {
  const telemetry = props.telemetryMap[id]
  if (!telemetry) return 'loading'
  return telemetry.online ? 'online' : 'offline'
}

const getMachineCpu = (id: string) => {
  const telemetry = props.telemetryMap[id]
  if (!telemetry || !telemetry.online) return 0
  return telemetry.cpuUsagePercent ?? 0
}

const getMachineRam = (id: string) => {
  const telemetry = props.telemetryMap[id]
  if (!telemetry || !telemetry.online) return 0
  return telemetry.ramUsagePercent ?? 0
}
</script>
