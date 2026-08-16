<template>
  <div class="modal modal-open backdrop-blur-md z-50">
    <div class="modal-box bg-base-200/95 border border-base-content/10 rounded-xl p-5 shadow-2xl max-w-md space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon :name="getTypeIcon(form.type)" size="20" />
          </div>
          <div>
            <h3 class="text-lg font-bold">{{ initialData?.id ? 'Edit Infrastructure Device' : 'Add Network / Info Device' }}</h3>
            <p class="text-xs text-base-content/60 font-medium">Routers, Switches, Subnets &amp; Infrastructure Hubs</p>
          </div>
        </div>

        <button @click="$emit('close')" class="btn btn-ghost btn-xs btn-square rounded-md">
          <Icon name="material-symbols:close-rounded" size="16" />
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-3.5 text-xs font-medium">
        <!-- Device Name -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-base-content/80">Device / Hub Name</span>
          </label>
          <input 
            v-model="form.name"
            type="text"
            required
            placeholder="e.g. Core Router, Lab Switch, Office Subnet"
            class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-semibold"
          />
        </div>

        <!-- Device Type -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-base-content/80">Device Type</span>
          </label>
          <select 
            v-model="form.type"
            class="select select-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary text-xs font-medium"
          >
            <option value="router">Router / Gateway</option>
            <option value="switch">Switch / Hub</option>
            <option value="subnet">Subnet Block (VLAN)</option>
            <option value="firewall">Firewall / Security Appliance</option>
            <option value="server">External / Dumb Server</option>
            <option value="custom">Custom Network Node</option>
          </select>
        </div>

        <!-- Grid: IP and CIDR Subnet -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-bold text-base-content/80">IP Address (Optional)</span>
            </label>
            <input 
              v-model="form.ip"
              type="text"
              placeholder="e.g. 100.64.0.1"
              class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono text-xs"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-bold text-base-content/80">Subnet CIDR (Auto-Link)</span>
            </label>
            <input 
              v-model="form.cidr"
              type="text"
              placeholder="e.g. 100.64.0.0/16"
              class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono text-xs"
            />
          </div>
        </div>

        <!-- Subnet explanation tip -->
        <div class="p-2.5 rounded-lg bg-base-100/60 border border-base-content/5 text-[11px] text-base-content/60 flex items-start gap-2">
          <Icon name="material-symbols:info-outline-rounded" size="16" class="text-primary mt-0.5 flex-shrink-0" />
          <span>
            Any nodes with an IP falling into the <strong>Subnet CIDR</strong> (e.g. <code class="font-mono text-primary font-bold">192.168.178.0/24</code>) will automatically link to this device in the topology graph!
          </span>
        </div>

        <!-- Description -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-base-content/80">Notes / Description</span>
          </label>
          <input 
            v-model="form.description"
            type="text"
            placeholder="e.g. Upstream FritzBox Router, Gigabit Switch"
            class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary text-xs"
          />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" @click="$emit('close')" class="btn btn-ghost btn-sm rounded-lg">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm rounded-lg shadow font-semibold gap-1.5" :disabled="saving">
            <span v-if="saving" class="loading loading-spinner loading-xs"></span>
            <Icon v-else name="material-symbols:check-rounded" size="16" />
            {{ initialData?.id ? 'Save Changes' : 'Add Device' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

const props = defineProps<{
  initialData?: any
}>()

const emit = defineEmits(['close', 'save'])

const saving = ref(false)

const form = reactive({
  id: '',
  name: '',
  type: 'router',
  ip: '',
  cidr: '',
  description: ''
})

onMounted(() => {
  if (props.initialData) {
    form.id = props.initialData.id || ''
    form.name = props.initialData.name || ''
    form.type = props.initialData.type || 'router'
    form.ip = props.initialData.ip || ''
    form.cidr = props.initialData.cidr || ''
    form.description = props.initialData.description || ''
  }
})

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'router': return 'material-symbols:router-outline-rounded'
    case 'switch': return 'material-symbols:hub-outline-rounded'
    case 'subnet': return 'material-symbols:lan-outline-rounded'
    case 'firewall': return 'material-symbols:shield-lock-outline-rounded'
    case 'server': return 'material-symbols:dns-outline-rounded'
    default: return 'material-symbols:device-hub-rounded'
  }
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const res = await $fetch<any>('/api/infrastructure', {
      method: 'POST',
      body: { ...form }
    })
    emit('save', res.device)
    emit('close')
  } catch (err: any) {
    alert(`Failed to save device: ${err.message}`)
  } finally {
    saving.value = false
  }
}
</script>
