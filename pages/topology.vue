<template>
  <div class="h-[calc(100vh-140px)] w-full rounded-xl overflow-hidden border border-base-content/10 bg-base-300/30 relative">
    <!-- Main Interactive Star Graph Canvas (Full Size) -->
    <div class="w-full h-full relative">
      <InfrastructureGraph
        :machines="machines"
        :devices="devices"
        :nodeServices="nodeServices"
        :links="links"
        :selectedNodeId="selectedNode?.id"
        @select-node="handleSelectNode"
        @open-add-device="openAddDeviceModal"
      />
    </div>

    <!-- Right-Hand Floating Inspector Drawer (Overlay) -->
    <Transition name="drawer">
      <InfrastructureDrawer 
        v-if="selectedNode"
        :node="selectedNode"
        :servicesMap="nodeServices"
        class="absolute right-0 top-0 bottom-0 z-30 shadow-2xl"
        @close="selectedNode = null"
        @edit-device="openEditDeviceModal"
        @refresh-graph="fetchTopologyData"
      />
    </Transition>

    <!-- Device Creation / Edit Modal -->
    <InfrastructureDeviceModal 
      v-if="deviceModalOpen"
      :initialData="editingDevice"
      @close="deviceModalOpen = false"
      @save="handleSaveDevice"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const machines = ref<any[]>([])
const devices = ref<any[]>([])
const nodeServices = ref<Record<string, any[]>>({})
const links = ref<any[]>([])
const selectedNode = ref<any | null>(null)
const deviceModalOpen = ref(false)
const editingDevice = ref<any | null>(null)

let pollTimer: any = null

const fetchTopologyData = async () => {
  try {
    const data = await $fetch<any>('/api/infrastructure')
    machines.value = data.machines || []
    devices.value = data.devices || []
    nodeServices.value = data.nodeServices || {}
    links.value = data.links || []

    // Keep selected node state in sync if it's currently open
    if (selectedNode.value) {
      const refreshedMachine = machines.value.find(m => m.id === selectedNode.value.id)
      const refreshedDevice = devices.value.find(d => d.id === selectedNode.value.id)
      if (refreshedMachine) {
        selectedNode.value = { ...selectedNode.value, ...refreshedMachine }
      } else if (refreshedDevice) {
        selectedNode.value = { ...selectedNode.value, ...refreshedDevice }
      }
    }
  } catch (err: any) {
    console.error('Failed to fetch infrastructure topology', err)
  }
}

const handleSelectNode = (node: any) => {
  selectedNode.value = node
}

const openAddDeviceModal = () => {
  editingDevice.value = null
  deviceModalOpen.value = true
}

const openEditDeviceModal = (device: any) => {
  editingDevice.value = device
  deviceModalOpen.value = true
}

const handleSaveDevice = async () => {
  deviceModalOpen.value = false
  await fetchTopologyData()
}

onMounted(async () => {
  await fetchTopologyData()
  pollTimer = setInterval(fetchTopologyData, 4000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
