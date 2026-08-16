<template>
  <div class="flex flex-col lg:flex-row items-start gap-5 min-h-[calc(100vh-140px)]">
    <!-- Machines Sidebar -->
    <MachineSidebar 
      :machines="machines"
      :selectedId="selectedId"
      :telemetryMap="telemetryMap"
      @select-machine="selectMachine"
      @open-add-modal="openAddModal"
      @reorder-machine="handleReorderMachine"
    />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Selected Machine Detail View -->
      <MachineDetail 
        v-if="selectedMachine"
        :machine="selectedMachine"
        :telemetry="telemetryMap[selectedMachine.id]"
        :currentTab="currentTab"
        @change-tab="handleTabChange"
        @edit-machine="openEditModal"
        @delete-machine="handleDeleteMachine"
      />

      <!-- Blank State (No machine selected / empty inventory) -->
      <div 
        v-else-if="!loading"
        class="flex-1 flex flex-col items-center justify-center p-10 text-center rounded-xl bg-base-200/40 border border-base-content/10 space-y-5"
      >
        <div class="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Icon name="material-symbols:space-dashboard-outline-rounded" size="32" />
        </div>

        <div class="space-y-1.5 max-w-md">
          <h2 class="text-xl font-bold tracking-tight">ControlCenter</h2>
          <p class="text-xs text-base-content/60 font-medium leading-relaxed">
            Select a machine from the sidebar to view hardware telemetry and open an interactive SSH terminal shell.
          </p>
        </div>

        <button 
          @click="openAddModal"
          class="btn btn-primary btn-sm rounded-lg shadow-md hover:scale-[1.02] transition-all font-semibold gap-1.5 text-xs"
        >
          <Icon name="material-symbols:add-rounded" size="18" />
          Add First Machine
        </button>
      </div>

      <!-- Loading skeleton placeholder while mounting -->
      <div v-else class="flex-1 flex items-center justify-center p-12">
        <span class="loading loading-spinner loading-md text-primary"></span>
      </div>
    </main>

    <!-- Machine Add / Edit Modal -->
    <MachineModal 
      v-if="modalOpen"
      :initialData="editingMachine"
      @close="modalOpen = false"
      @save="handleSaveMachine"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const machines = ref<any[]>([])
const selectedId = ref<string | null>(null)
const telemetryMap = ref<Record<string, any>>({})
const modalOpen = ref(false)
const editingMachine = ref<any | null>(null)
const loading = ref(true)

let pollTimer: any = null

const currentTab = computed(() => {
  const t = route.query.tab as string
  return (t && ['telemetry', 'terminal', 'info'].includes(t)) ? t : 'telemetry'
})

const selectedMachine = computed(() => {
  return machines.value.find(m => m.id === selectedId.value) || null
})

const checkAuthAndLoad = async () => {
  loading.value = true
  try {
    const [authStatus, list] = await Promise.all([
      $fetch<any>('/api/auth/status'),
      $fetch<any[]>('/api/machines')
    ])

    if (!authStatus.onboarded) {
      router.push('/setup')
      return
    }
    if (!authStatus.authenticated) {
      router.push('/login')
      return
    }

    machines.value = list

    // URL parameter sync
    const queryMachine = route.query.machine as string
    if (queryMachine && list.some(m => m.id === queryMachine)) {
      selectedId.value = queryMachine
    } else if (list.length > 0) {
      selectedId.value = list[0].id
      router.replace({ query: { ...route.query, machine: list[0].id } })
    }

    // Parallel background telemetry fetch (no blocking UI render)
    fetchAllTelemetry()
  } catch {
    router.push('/login')
  } finally {
    loading.value = false
  }
}

const fetchAllTelemetry = async () => {
  if (machines.value.length === 0) return

  await Promise.all(
    machines.value.map(async (m) => {
      try {
        const stats = await $fetch(`/api/machines/${m.id}/stats`)
        telemetryMap.value = { ...telemetryMap.value, [m.id]: stats }
      } catch {
        telemetryMap.value = { ...telemetryMap.value, [m.id]: { online: false } }
      }
    })
  )
}

const selectMachine = (id: string) => {
  selectedId.value = id
  router.push({ query: { ...route.query, machine: id } })
}

const handleTabChange = (tab: string) => {
  router.push({ query: { ...route.query, tab } })
}

const openAddModal = () => {
  editingMachine.value = null
  modalOpen.value = true
}

const openEditModal = (machine: any) => {
  editingMachine.value = machine
  modalOpen.value = true
}

const handleSaveMachine = async (formData: any) => {
  try {
    let savedMachineId = formData.id
    if (formData.id) {
      await $fetch(`/api/machines/${formData.id}`, {
        method: 'PUT',
        body: formData
      })
    } else {
      const res = await $fetch<any>('/api/machines', {
        method: 'POST',
        body: formData
      })
      if (res.machine?.id) {
        savedMachineId = res.machine.id
      }
    }
    modalOpen.value = false
    const list = await $fetch<any[]>('/api/machines')
    machines.value = list

    if (savedMachineId) {
      selectMachine(savedMachineId)
    }
  } catch (err: any) {
    alert(`Failed to save machine: ${err.message}`)
  }
}

const handleReorderMachine = async ({ id, direction }: { id: string, direction: 'up' | 'down' }) => {
  const index = machines.value.findIndex(m => m.id === id)
  if (index === -1) return

  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= machines.value.length) return

  // Swap locally for instant feedback
  const mList = [...machines.value]
  const temp = mList[index]
  mList[index] = mList[newIndex]
  mList[newIndex] = temp
  
  machines.value = mList

  // Persist to backend
  try {
    const machineIds = mList.map(m => m.id)
    await $fetch('/api/machines/reorder', {
      method: 'PUT',
      body: { machineIds }
    })
  } catch (err: any) {
    alert(`Failed to save new order: ${err.message}`)
  }
}

const handleDeleteMachine = async (id: string) => {
  if (!confirm('Are you sure you want to delete this machine from ControlCenter?')) return
  try {
    await $fetch(`/api/machines/${id}`, { method: 'DELETE' })
    if (selectedId.value === id) {
      selectedId.value = null
    }
    const list = await $fetch<any[]>('/api/machines')
    machines.value = list
  } catch (err: any) {
    alert(`Failed to delete machine: ${err.message}`)
  }
}

// Sync route query changes (e.g. browser back/forward navigation)
watch(() => route.query.machine, (newMachineId) => {
  if (newMachineId && typeof newMachineId === 'string' && machines.value.some(m => m.id === newMachineId)) {
    selectedId.value = newMachineId
  }
})

const refreshAll = async () => {
  try {
    const list = await $fetch<any[]>('/api/machines')
    const currentSummary = JSON.stringify(machines.value.map(m => ({ id: m.id, name: m.name, ip: m.ip })))
    const newSummary = JSON.stringify(list.map(m => ({ id: m.id, name: m.name, ip: m.ip })))
    if (currentSummary !== newSummary) {
      machines.value = list
      if (!selectedId.value && list.length > 0) {
        selectedId.value = list[0].id
        router.replace({ query: { ...route.query, machine: list[0].id } })
      }
    }
  } catch {}

  if (machines.value.length > 0) {
    await fetchAllTelemetry()
  }
}

onMounted(async () => {
  await checkAuthAndLoad()
  pollTimer = setInterval(refreshAll, 3000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>
