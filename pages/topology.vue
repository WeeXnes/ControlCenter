<template>
  <div class="h-[calc(100vh-140px)] flex rounded-xl overflow-hidden border border-base-content/10 bg-base-300/30 relative">
    <!-- Main Interactive Star Graph Canvas -->
    <div class="flex-1 relative flex flex-col min-w-0 h-full">
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

    <!-- Right-Hand Inspector Drawer -->
    <InfrastructureDrawer 
      v-if="selectedNode"
      :node="selectedNode"
      :servicesMap="nodeServices"
      @close="selectedNode = null"
      @edit-device="openEditDeviceModal"
      @refresh-graph="fetchTopologyData"
    />

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
