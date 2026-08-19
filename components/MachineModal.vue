<template>
  <div class="modal modal-open backdrop-blur-md z-50">
    <div class="modal-box bg-base-200/95 border border-base-content/10 rounded-xl p-5 shadow-2xl max-w-xl space-y-4">
      <!-- Modal Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon name="material-symbols:dns-outline-rounded" size="20" />
          </div>
          <div>
            <h3 class="text-base font-bold">{{ isEdit ? 'Edit Machine Settings' : 'Add New Machine' }}</h3>
            <p class="text-[11px] text-base-content/60 font-medium">Zero-Trust Reverse WebSocket &amp; SSH Terminal Configuration</p>
          </div>
        </div>

        <button @click="$emit('close')" class="btn btn-ghost btn-xs btn-square rounded-md">
          <Icon name="material-symbols:close-rounded" size="16" />
        </button>
      </div>

      <!-- Navigation Tabs inside Modal -->
      <div class="flex items-center gap-2 border-b border-base-content/10 pb-2">
        <button 
          type="button"
          @click="activeTab = 'config'"
          class="btn btn-xs rounded-lg transition-all gap-1.5 font-semibold"
          :class="activeTab === 'config' ? 'btn-primary' : 'btn-ghost text-base-content/70'"
        >
          <Icon name="material-symbols:tune-rounded" size="14" />
          General &amp; SSH Settings
        </button>

        <button 
          type="button"
          @click="activeTab = 'enrollment'"
          class="btn btn-xs rounded-lg transition-all gap-1.5 font-semibold"
          :class="activeTab === 'enrollment' ? 'btn-primary' : 'btn-ghost text-base-content/70'"
        >
          <Icon name="material-symbols:terminal-rounded" size="14" />
          1-Line Daemon Setup
        </button>
      </div>

      <!-- Tab 1: Configuration Form -->
      <form v-if="activeTab === 'config'" @submit.prevent="handleSubmit" class="space-y-3 text-xs font-medium">
        <!-- Machine Display Name -->
        <div class="form-control">
          <label class="label py-0.5">
            <span class="label-text font-bold text-base-content/80">Machine Name</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="e.g. Production Node 01"
            class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-medium"
          />
        </div>

        <!-- IP Address / Hostname -->
        <div class="grid grid-cols-3 gap-3">
          <div class="form-control col-span-2">
            <label class="label py-0.5">
              <span class="label-text font-bold text-base-content/80">IP Address / Hostname</span>
            </label>
            <input
              v-model="form.ip"
              type="text"
              required
              placeholder="e.g. 192.168.1.100"
              class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono"
            />
            <!-- Detected IP chips -->
            <div v-if="detectedIps.length > 1" class="flex items-center gap-1.5 flex-wrap pt-1.5">
              <span class="text-[10px] text-base-content/50 font-medium">Detected:</span>
              <button 
                v-for="dip in detectedIps" 
                :key="dip" 
                type="button" 
                @click="form.ip = dip"
                class="badge badge-xs gap-1 font-mono cursor-pointer transition-all"
                :class="form.ip === dip ? 'badge-primary font-bold' : 'badge-ghost border-base-content/10 hover:border-primary/40'"
              >
                {{ dip }}
              </button>
            </div>
          </div>

          <div class="form-control">
            <label class="label py-0.5">
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

        <!-- Pre-Shared Secret / Token -->
        <div class="form-control">
          <label class="label py-0.5 flex justify-between">
            <span class="label-text font-bold text-base-content/80">Daemon Pre-Shared Token</span>
            <button 
              type="button" 
              @click="generateRandomToken"
              class="label-text-alt text-[10px] text-primary hover:underline"
            >
              Generate New
            </button>
          </label>
          <div class="relative">
            <input
              v-model="form.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="Auto-generated secure token"
              class="input input-sm w-full rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono pr-8 text-xs"
            />
            <button 
              type="button" 
              @click="showApiKey = !showApiKey" 
              class="absolute right-2 top-1.5 text-base-content/50 hover:text-base-content"
            >
              <Icon :name="showApiKey ? 'material-symbols:visibility-off-rounded' : 'material-symbols:visibility-rounded'" size="14" />
            </button>
          </div>
        </div>

        <div class="divider my-1 opacity-20">SSH Terminal Authentication</div>

        <!-- SSH User -->
        <div class="grid grid-cols-2 gap-3">
          <div class="form-control">
            <label class="label py-0.5">
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
            <label class="label py-0.5">
              <span class="label-text font-bold text-base-content/80">Auth Method</span>
            </label>
            <select 
              v-model="form.sshAuthType" 
              class="select select-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-medium text-xs"
            >
              <option value="key">Private Key (Recommended)</option>
              <option value="password">Password</option>
            </select>
          </div>
        </div>

        <!-- SSH Key or Password -->
        <div v-if="form.sshAuthType === 'password'" class="form-control">
          <label class="label py-0.5">
            <span class="label-text font-bold text-base-content/80">SSH Password</span>
          </label>
          <input
            v-model="form.sshPassword"
            type="password"
            placeholder="Enter SSH password"
            class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono text-xs"
          />
        </div>

        <div v-else class="form-control">
          <label class="label py-0.5 flex justify-between">
            <span class="label-text font-bold text-base-content/80">SSH Private Key File</span>
            <span class="label-text-alt text-[10px] text-base-content/50">Stored in ~/.ssh/ControlCenterKeys/</span>
          </label>

          <select 
            v-model="form.sshKeyFile" 
            class="select select-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono text-xs"
          >
            <option value="" disabled>Select a saved SSH Key...</option>
            <option v-for="key in availableKeys" :key="key" :value="key">
              {{ key }}
            </option>
          </select>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-2 border-t border-base-content/5">
          <button type="button" @click="$emit('close')" class="btn btn-ghost btn-sm rounded-lg">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm rounded-lg shadow font-semibold" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-xs"></span>
            {{ isEdit ? 'Save Changes' : 'Save & View Install Command' }}
          </button>
        </div>
      </form>

      <!-- Tab 2: 1-Line Setup Instructions -->
      <div v-else class="space-y-4 text-xs font-medium">
        <div class="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
          <p class="font-bold text-primary flex items-center gap-1.5">
            <Icon name="material-symbols:security-rounded" size="16" />
            Zero-Trust Outbound Architecture
          </p>
          <p class="text-[11px] text-base-content/70 leading-relaxed">
            The daemon connects <strong>outbound</strong> over TLS to this ControlCenter instance. Target nodes require <strong>0 open ports</strong> and verify the server's SSL certificate directly.
          </p>
        </div>

        <!-- 1-Line Install Command Box -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-base-content/90 flex items-center gap-1.5">
              <Icon name="material-symbols:terminal-rounded" class="text-primary" size="14" />
              1-Line Standalone / Shell Setup
            </span>
            <button 
              type="button"
              @click="copyCommand(standaloneCliCommand)"
              class="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded gap-1 font-semibold text-[10px]"
            >
              <Icon :name="copied ? 'material-symbols:check-circle-rounded' : 'material-symbols:content-copy-rounded'" size="13" />
              {{ copied ? 'Copied!' : 'Copy Command' }}
            </button>
          </div>

          <div class="font-mono text-[11px] bg-[#090b10] text-emerald-400 p-3 rounded-lg border border-base-content/10 overflow-x-auto select-all leading-relaxed break-all">
            {{ standaloneCliCommand }}
          </div>
        </div>

        <!-- Arch Linux / AUR Command Box -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-base-content/90 flex items-center gap-1.5">
              <Icon name="material-symbols:package-2-outline-rounded" class="text-secondary" size="14" />
              Arch Linux / AUR Package Setup
            </span>
            <button 
              type="button"
              @click="copyCommand(aurCliCommand)"
              class="btn btn-ghost btn-xs text-secondary hover:bg-secondary/10 rounded gap-1 font-semibold text-[10px]"
            >
              <Icon name="material-symbols:content-copy-rounded" size="13" />
              Copy
            </button>
          </div>

          <div class="font-mono text-[11px] bg-[#090b10] text-sky-400 p-3 rounded-lg border border-base-content/10 overflow-x-auto select-all leading-relaxed break-all">
            {{ aurCliCommand }}
          </div>
        </div>

        <!-- Summary Parameters -->
        <div class="p-2.5 rounded-lg bg-base-100 border border-base-content/5 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span class="text-base-content/50">Server WebSocket:</span>
            <p class="font-mono font-bold text-base-content truncate">{{ currentServerUrl }}</p>
          </div>
          <div>
            <span class="text-base-content/50">Machine ID:</span>
            <p class="font-mono font-bold text-base-content truncate">{{ form.id || 'Generated on save' }}</p>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-base-content/5">
          <button type="button" @click="$emit('close')" class="btn btn-primary btn-sm rounded-lg shadow font-semibold">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

const props = defineProps<{
  initialData?: any
}>()

const emit = defineEmits(['close', 'save'])

const isEdit = ref(false)
const submitting = ref(false)
const activeTab = ref<'config' | 'enrollment'>('config')
const availableKeys = ref<string[]>([])
const copied = ref(false)
const showApiKey = ref(false)
const serverCertFingerprint = ref('')
const detectedIps = ref<string[]>([])

const form = reactive({
  id: '',
  name: '',
  ip: '',
  daemonPort: 9100,
  apiKey: '',
  sshUser: 'root',
  sshPort: 22,
  sshAuthType: 'key',
  sshPassword: '',
  sshKeyFile: ''
})

const generateRandomToken = () => {
  const chars = 'abcdef0123456789'
  let token = 'cc_'
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  form.apiKey = token
}

const currentServerUrl = computed(() => {
  if (process.client) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/daemon`
  }
  return 'wss://controlcenter.vpn/ws/daemon'
})

const standaloneCliCommand = computed(() => {
  const server = currentServerUrl.value
  const id = form.id || 'MACHINE_ID'
  const key = form.apiKey || 'TOKEN'
  const pin = serverCertFingerprint.value ? ` --pin "${serverCertFingerprint.value}"` : ''
  return `sudo controlcenter-daemon --install-service --server "${server}" --id "${id}" --key "${key}"${pin}`
})

const aurCliCommand = computed(() => {
  const server = currentServerUrl.value
  const id = form.id || 'MACHINE_ID'
  const key = form.apiKey || 'TOKEN'
  const pin = serverCertFingerprint.value ? ` --pin "${serverCertFingerprint.value}"` : ''
  return `sudo controlcenter-daemon --install-service --server "${server}" --id "${id}" --key "${key}"${pin}`
})

const copyCommand = (text: string) => {
  if (process.client) {
    navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

const fetchSshKeys = async () => {
  try {
    const res = await $fetch<{ keys: string[] }>('/api/ssh-keys')
    availableKeys.value = res.keys || []
  } catch {}
}

const fetchServerStatus = async () => {
  try {
    const res = await $fetch<{ certFingerprint?: string }>('/api/auth/status')
    if (res?.certFingerprint) {
      serverCertFingerprint.value = res.certFingerprint
    }
  } catch {}
}

onMounted(async () => {
  await Promise.all([fetchSshKeys(), fetchServerStatus()])

  if (props.initialData) {
    isEdit.value = true
    form.id = props.initialData.id || ''
    form.name = props.initialData.name || ''
    form.ip = props.initialData.ip || ''
    form.daemonPort = props.initialData.daemonPort || 9100
    form.apiKey = props.initialData.apiKey || ''
    form.sshUser = props.initialData.sshUser || 'root'
    form.sshPort = props.initialData.sshPort || 22
    form.sshAuthType = props.initialData.sshAuthType || 'key'
    form.sshPassword = props.initialData.sshPassword || ''
    form.sshKeyFile = props.initialData.sshKeyFile || ''

    if (form.id) {
      try {
        const stats = await $fetch<any>(`/api/machines/${form.id}/stats`)
        if (Array.isArray(stats?.ipAddresses)) {
          detectedIps.value = stats.ipAddresses
        }
      } catch {}
    }
  } else {
    generateRandomToken()
  }
})

const handleSubmit = async () => {
  submitting.value = true
  try {
    emit('save', { ...form })
    activeTab.value = 'enrollment'
  } finally {
    submitting.value = false
  }
}
</script>
