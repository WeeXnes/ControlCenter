<template>
  <div class="modal modal-open backdrop-blur-md z-50">
    <div class="modal-box bg-base-200/95 border border-base-content/10 rounded-xl p-5 shadow-2xl max-w-lg space-y-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon name="material-symbols:dns-outline-rounded" size="18" />
          </div>
          <div>
            <h3 class="text-lg font-bold">{{ isEdit ? 'Edit Machine Settings' : 'Add New Machine' }}</h3>
            <p class="text-xs text-base-content/60 font-medium">Configure host telemetry &amp; SSH access</p>
          </div>
        </div>

        <button @click="$emit('close')" class="btn btn-ghost btn-xs btn-square rounded-md">
          <Icon name="material-symbols:close-rounded" size="16" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-3.5 text-xs font-medium">
        <!-- Machine Display Name -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-base-content/80">Machine Name</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="e.g. Server 1"
            class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-medium"
          />
        </div>

        <!-- IP Address & Daemon Port -->
        <div class="grid grid-cols-3 gap-3">
          <div class="form-control col-span-2">
            <label class="label py-1">
              <span class="label-text font-bold text-base-content/80">IP Address / Hostname</span>
            </label>
            <input
              v-model="form.ip"
              type="text"
              required
              placeholder="e.g. 192.168.1.100"
              class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-bold text-base-content/80">Daemon Port</span>
            </label>
            <input
              v-model.number="form.daemonPort"
              type="number"
              required
              placeholder="9100"
              class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono"
            />
          </div>
        </div>

        <!-- Daemon API Key -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-base-content/80">Daemon API Key (Optional)</span>
          </label>
          <input
            v-model="form.apiKey"
            type="password"
            placeholder="Key configured in C# Daemon"
            class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono"
          />
        </div>

        <div class="divider my-1 opacity-20">SSH Credentials</div>

        <!-- SSH User & Port -->
        <div class="grid grid-cols-3 gap-3">
          <div class="form-control col-span-2">
            <label class="label py-1">
              <span class="label-text font-bold text-base-content/80">SSH Username</span>
            </label>
            <input
              v-model="form.sshUser"
              type="text"
              required
              placeholder="root"
              class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-bold text-base-content/80">SSH Port</span>
            </label>
            <input
              v-model.number="form.sshPort"
              type="number"
              required
              placeholder="22"
              class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono"
            />
          </div>
        </div>

        <!-- SSH Authentication Type -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-base-content/80">SSH Authentication Method</span>
          </label>
          <select 
            v-model="form.sshAuthType" 
            class="select select-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-medium"
          >
            <option value="password">Password Authentication</option>
            <option value="key">Private Key Authentication</option>
          </select>
        </div>

        <!-- SSH Password -->
        <div v-if="form.sshAuthType === 'password'" class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-base-content/80">SSH Password</span>
          </label>
          <input
            v-model="form.sshPassword"
            type="password"
            placeholder="SSH password"
            class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono"
          />
        </div>

        <!-- SSH Private Key File Dropdown -->
        <div v-else class="form-control">
          <label class="label py-1 flex justify-between">
            <span class="label-text font-bold text-base-content/80">SSH Private Key File</span>
            <span class="label-text-alt text-[10px] text-base-content/50">Stored in ~/.ssh/ControlCenterKeys/</span>
          </label>
          
          <div v-if="loadingKeys" class="input input-sm rounded-lg bg-base-100 border-base-content/10 flex items-center justify-center">
            <span class="loading loading-spinner loading-xs text-primary"></span>
          </div>

          <select 
            v-else
            v-model="form.sshKeyFile" 
            class="select select-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono text-xs"
          >
            <option value="" disabled>Select an SSH Key File...</option>
            <option v-for="key in availableKeys" :key="key" :value="key">
              {{ key }}
            </option>
          </select>
          
          <p v-if="!loadingKeys && availableKeys.length === 0" class="text-[10px] text-warning mt-1">
            No keys found in ~/.ssh/ControlCenterKeys/. Use the Settings menu to add keys.
          </p>
        </div>

        <!-- Quick Setup helper box: ssh-copy-id command -->
        <div v-if="form.sshAuthType === 'key' && form.sshKeyFile && form.ip.trim()" class="p-3 rounded-lg bg-base-100/90 border border-primary/20 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-primary flex items-center gap-1.5">
              <Icon name="material-symbols:terminal-rounded" size="14" />
              Copy Key to Target Server Command
            </span>
            <button 
              type="button"
              @click="copySshCopyId"
              class="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded gap-1 font-semibold text-[10px]"
            >
              <Icon :name="copiedCmd ? 'material-symbols:check-circle-rounded' : 'material-symbols:content-copy-rounded'" size="13" />
              {{ copiedCmd ? 'Copied!' : 'Copy' }}
            </button>
          </div>

          <div class="font-mono text-[11px] bg-base-300/80 p-2 rounded border border-base-content/10 overflow-x-auto text-base-content/90 select-all leading-relaxed">
            ssh-copy-id -i ~/.ssh/ControlCenterKeys/{{ form.sshKeyFile }} {{ form.sshUser.trim() || 'root' }}@{{ form.ip.trim() }}
          </div>
          <p class="text-[10px] text-base-content/50">Run this once in your terminal to install the public key on the remote machine.</p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-3 border-t border-base-content/5">
          <button type="button" @click="$emit('close')" class="btn btn-ghost btn-sm rounded-lg">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm rounded-lg shadow font-semibold" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-xs"></span>
            {{ isEdit ? 'Save Changes' : 'Add Machine' }}
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

const isEdit = ref(false)
const submitting = ref(false)
const availableKeys = ref<string[]>([])
const loadingKeys = ref(false)
const copiedCmd = ref(false)

const copySshCopyId = () => {
  const user = form.sshUser ? form.sshUser.trim() : 'root'
  const ip = form.ip ? form.ip.trim() : 'target-ip'
  const cmd = `ssh-copy-id -i ~/.ssh/ControlCenterKeys/${form.sshKeyFile} ${user}@${ip}`
  if (process.client) {
    navigator.clipboard.writeText(cmd)
    copiedCmd.value = true
    setTimeout(() => {
      copiedCmd.value = false
    }, 2000)
  }
}

const form = reactive({
  id: '',
  name: '',
  ip: '',
  daemonPort: 9100,
  apiKey: '',
  sshUser: 'root',
  sshPort: 22,
  sshAuthType: 'password',
  sshPassword: '',
  sshKeyFile: ''
})

const fetchSshKeys = async () => {
  loadingKeys.value = true
  try {
    const res = await $fetch<{ keys: string[] }>('/api/ssh-keys')
    availableKeys.value = res.keys || []
  } catch (err) {
    console.error('Failed to load SSH keys', err)
  } finally {
    loadingKeys.value = false
  }
}

onMounted(async () => {
  await fetchSshKeys()

  if (props.initialData) {
    isEdit.value = true
    form.id = props.initialData.id || ''
    form.name = props.initialData.name || ''
    form.ip = props.initialData.ip || ''
    form.daemonPort = props.initialData.daemonPort || 9100
    form.apiKey = props.initialData.apiKey || ''
    form.sshUser = props.initialData.sshUser || 'root'
    form.sshPort = props.initialData.sshPort || 22
    form.sshAuthType = props.initialData.sshAuthType || 'password'
    form.sshPassword = props.initialData.sshPassword || ''
    form.sshKeyFile = props.initialData.sshKeyFile || props.initialData.sshPrivateKey || ''
  }
})

const handleSubmit = async () => {
  submitting.value = true
  try {
    emit('save', { ...form })
  } finally {
    submitting.value = false
  }
}
</script>
