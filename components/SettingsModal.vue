<template>
  <div class="modal modal-open backdrop-blur-md z-50">
    <div class="modal-box bg-base-200/95 border border-base-content/10 rounded-xl p-5 shadow-2xl max-w-xl space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon name="material-symbols:settings-outline-rounded" size="20" />
          </div>
          <div>
            <h3 class="text-lg font-bold">Settings</h3>
            <p class="text-xs text-base-content/60 font-medium">Manage SSH Keys &amp; System Configuration</p>
          </div>
        </div>

        <button @click="$emit('close')" class="btn btn-ghost btn-xs btn-square rounded-md">
          <Icon name="material-symbols:close-rounded" size="16" />
        </button>
      </div>

      <!-- Content -->
      <div class="space-y-4 text-xs font-medium">
        <!-- SSH Keys Directory Info Banner -->
        <div class="p-3 rounded-lg bg-base-100/70 border border-base-content/10 flex items-start gap-2.5">
          <Icon name="material-symbols:folder-zip-outline-rounded" size="18" class="text-primary mt-0.5 flex-shrink-0" />
          <div class="space-y-1">
            <p class="font-bold text-base-content/90">SSH Private Key Storage</p>
            <p class="text-[11px] text-base-content/60 leading-relaxed">
              Keys are stored securely on the host in <code class="font-mono text-primary font-semibold">~/.ssh/ControlCenterKeys/</code> with restricted <code class="font-mono text-primary font-semibold">0600</code> permissions.
            </p>
          </div>
        </div>

        <!-- Section: Existing Keys -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-base-content/80">Saved SSH Key Files</span>
            <span class="text-[11px] font-mono text-base-content/50">{{ keys.length }} {{ keys.length === 1 ? 'key' : 'keys' }} available</span>
          </div>

          <div v-if="loadingKeys" class="p-4 text-center">
            <span class="loading loading-spinner loading-xs text-primary"></span>
          </div>

          <div v-else-if="keys.length === 0" class="p-4 text-center text-base-content/50 rounded-lg bg-base-100/40 border border-base-content/5 space-y-1">
            <Icon name="material-symbols:key-off-outline-rounded" size="24" class="mx-auto opacity-40" />
            <p class="text-xs font-medium">No SSH key files stored yet.</p>
            <p class="text-[10px]">Add one below or place files manually in ~/.ssh/ControlCenterKeys/</p>
          </div>

          <div v-else class="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            <div 
              v-for="key in keys" 
              :key="key"
              class="flex items-center justify-between p-2.5 rounded-lg bg-base-100 border border-base-content/10 hover:border-base-content/20 transition-all"
            >
              <div class="flex items-center gap-2 font-mono text-xs">
                <Icon name="material-symbols:key-rounded" class="text-primary" size="16" />
                <span class="font-bold">{{ key }}</span>
              </div>

              <button 
                @click="deleteKey(key)" 
                class="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-md gap-1"
                :disabled="deletingKey === key"
              >
                <span v-if="deletingKey === key" class="loading loading-spinner loading-xs"></span>
                <Icon v-else name="material-symbols:delete-outline-rounded" size="14" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div class="divider my-1 opacity-20">Add New Key</div>

        <!-- Section: Add Key Form -->
        <form @submit.prevent="saveKey" class="space-y-3">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-bold text-base-content/80">Key Filename</span>
            </label>
            <input 
              v-model="newFilename" 
              type="text" 
              required
              placeholder="e.g. server_prod_key"
              class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono"
            />
            <span class="label-text-alt text-[10px] text-base-content/50 mt-1">Alphanumeric characters, hyphens, and underscores only.</span>
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-bold text-base-content/80">Private Key Content</span>
            </label>
            <textarea
              v-model="newContent"
              rows="4"
              required
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
              class="textarea textarea-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono text-[11px] leading-snug"
            ></textarea>
          </div>

          <div v-if="errorMsg" class="alert alert-error text-xs py-2 rounded-lg">
            <span>{{ errorMsg }}</span>
          </div>

          <div v-if="successMsg" class="alert alert-success text-xs py-2 rounded-lg">
            <span>{{ successMsg }}</span>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="$emit('close')" class="btn btn-ghost btn-sm rounded-lg">Close</button>
            <button type="submit" class="btn btn-primary btn-sm rounded-lg shadow font-semibold gap-1" :disabled="saving">
              <span v-if="saving" class="loading loading-spinner loading-xs"></span>
              <Icon v-else name="material-symbols:add-task-rounded" size="16" />
              Save SSH Key
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits(['close', 'keys-updated'])

const keys = ref<string[]>([])
const loadingKeys = ref(false)
const saving = ref(false)
const deletingKey = ref<string | null>(null)
const newFilename = ref('')
const newContent = ref('')
const errorMsg = ref('')
const successMsg = ref('')

const fetchKeys = async () => {
  loadingKeys.value = true
  try {
    const res = await $fetch<{ keys: string[] }>('/api/ssh-keys')
    keys.value = res.keys || []
    emit('keys-updated')
  } catch (err: any) {
    console.error('Failed to fetch SSH keys', err)
  } finally {
    loadingKeys.value = false
  }
}

const saveKey = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  saving.value = true

  try {
    await $fetch('/api/ssh-keys', {
      method: 'POST',
      body: {
        filename: newFilename.value,
        content: newContent.value
      }
    })
    successMsg.value = `SSH key "${newFilename.value}" saved successfully!`
    newFilename.value = ''
    newContent.value = ''
    await fetchKeys()
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || err.message || 'Failed to save SSH key'
  } finally {
    saving.value = false
  }
}

const deleteKey = async (filename: string) => {
  if (!confirm(`Are you sure you want to delete the key "${filename}"?`)) return
  deletingKey.value = filename
  errorMsg.value = ''
  successMsg.value = ''

  try {
    await $fetch(`/api/ssh-keys/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    })
    await fetchKeys()
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || err.message || 'Failed to delete SSH key'
  } finally {
    deletingKey.value = null
  }
}

onMounted(() => {
  fetchKeys()
})
</script>
