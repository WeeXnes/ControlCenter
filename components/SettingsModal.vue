<template>
  <div class="modal modal-open backdrop-blur-md z-50">
    <div class="modal-box bg-base-200/95 border border-base-content/10 rounded-xl p-5 shadow-2xl max-w-2xl space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon name="material-symbols:settings-outline-rounded" size="20" />
          </div>
          <div>
            <h3 class="text-lg font-bold">ControlCenter Settings</h3>
            <p class="text-xs text-base-content/60 font-medium">Device Approvals, SSH Keys &amp; System Configuration</p>
          </div>
        </div>

        <button @click="$emit('close')" class="btn btn-ghost btn-xs btn-square rounded-md">
          <Icon name="material-symbols:close-rounded" size="16" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs tabs-boxed bg-base-300/60 p-1 rounded-lg flex gap-1">
        <button 
          @click="activeTab = 'devices'"
          class="tab tab-sm flex-1 font-bold text-xs gap-1.5 transition-all"
          :class="activeTab === 'devices' ? 'tab-active bg-primary text-primary-content' : 'text-base-content/70 hover:text-base-content'"
        >
          <Icon name="material-symbols:devices-outline-rounded" size="16" />
          <span>Devices &amp; Approvals</span>
          <span v-if="pendingDevices.length > 0" class="badge badge-warning badge-xs font-mono font-bold px-1.5 py-0.5 ml-1">
            {{ pendingDevices.length }}
          </span>
        </button>

        <button 
          @click="activeTab = 'ssh'"
          class="tab tab-sm flex-1 font-bold text-xs gap-1.5 transition-all"
          :class="activeTab === 'ssh' ? 'tab-active bg-primary text-primary-content' : 'text-base-content/70 hover:text-base-content'"
        >
          <Icon name="material-symbols:vpn-key-rounded" size="16" />
          <span>SSH Keys &amp; Auth</span>
        </button>

        <button 
          @click="activeTab = 'security'"
          class="tab tab-sm flex-1 font-bold text-xs gap-1.5 transition-all"
          :class="activeTab === 'security' ? 'tab-active bg-primary text-primary-content' : 'text-base-content/70 hover:text-base-content'"
        >
          <Icon name="material-symbols:shield-lock-outline-rounded" size="16" />
          <span>Security &amp; 2FA</span>
          <span v-if="twoFactorEnabled" class="badge badge-success badge-xs font-mono font-bold px-1.5 py-0.5 ml-1">
            ON
          </span>
        </button>
      </div>

      <!-- Tab 1: Devices & Approvals -->
      <div v-if="activeTab === 'devices'" class="space-y-4 text-xs font-medium">
        <!-- Section: Pending Approvals Queue -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-base-content/90">Pending Device Approvals</span>
              <span v-if="pendingDevices.length > 0" class="badge badge-warning badge-xs font-bold font-mono">
                {{ pendingDevices.length }} awaiting approval
              </span>
            </div>
            <button @click="fetchMachines" class="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-primary">
              <Icon name="material-symbols:refresh-rounded" size="14" />
              Refresh
            </button>
          </div>

          <div v-if="loadingMachines" class="p-4 text-center">
            <span class="loading loading-spinner loading-xs text-primary"></span>
          </div>

          <div v-else-if="pendingDevices.length === 0" class="p-4 text-center rounded-lg bg-base-100/50 border border-base-content/5 space-y-1">
            <Icon name="material-symbols:verified-user-outline-rounded" size="24" class="mx-auto text-success/60" />
            <p class="text-xs font-semibold text-base-content/80">No pending device requests.</p>
            <p class="text-[11px] text-base-content/50">When a new daemon connects with <code class="font-mono text-primary">--address</code>, it will appear here for one-click approval.</p>
          </div>

          <div v-else class="space-y-2">
            <div 
              v-for="dev in pendingDevices" 
              :key="dev.id"
              class="p-3 rounded-lg bg-base-100 border border-warning/30 space-y-2 shadow-sm"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-md bg-warning/15 text-warning flex items-center justify-center flex-shrink-0">
                    <Icon name="material-symbols:computer-outline-rounded" size="18" />
                  </div>
                  <div>
                    <h4 class="font-bold text-base-content text-xs">{{ dev.name }}</h4>
                    <p class="text-[10px] font-mono text-base-content/50">ID: {{ dev.id }} | IP: {{ dev.ip }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-1.5">
                  <button 
                    @click="approveDevice(dev.id)"
                    class="btn btn-success btn-xs gap-1 font-bold text-success-content shadow-sm rounded-md"
                    :disabled="processingId === dev.id"
                  >
                    <span v-if="processingId === dev.id" class="loading loading-spinner loading-xs"></span>
                    <Icon v-else name="material-symbols:check-circle-rounded" size="14" />
                    Approve Device
                  </button>

                  <button 
                    @click="rejectDevice(dev.id)"
                    class="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-md"
                    :disabled="processingId === dev.id"
                  >
                    <Icon name="material-symbols:cancel-outline-rounded" size="14" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="divider my-1 opacity-20">Approved Devices</div>

        <!-- Section: Approved Devices List -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-base-content/80">Approved Nodes ({{ approvedDevices.length }})</span>
          </div>

          <div v-if="approvedDevices.length === 0" class="p-3 text-center text-base-content/50 rounded-lg bg-base-100/30">
            No approved devices yet.
          </div>

          <div v-else class="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            <div 
              v-for="dev in approvedDevices" 
              :key="dev.id"
              class="flex items-center justify-between p-2.5 rounded-lg bg-base-100 border border-base-content/10"
            >
              <div class="flex items-center gap-2">
                <Icon name="material-symbols:laptop-mac-outline-rounded" class="text-primary" size="16" />
                <div>
                  <span class="font-bold text-xs">{{ dev.name }}</span>
                  <span class="text-[10px] font-mono text-base-content/50 ml-2">({{ dev.ip }})</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="badge badge-success badge-xs font-bold">APPROVED</span>
                <button 
                  @click="rejectDevice(dev.id)"
                  class="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-md"
                  title="Remove Device"
                >
                  <Icon name="material-symbols:delete-outline-rounded" size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: SSH Keys & Auth -->
      <div v-if="activeTab === 'ssh'" class="space-y-4 text-xs font-medium">
        <!-- SSH Keys Directory Info Banner -->
        <div class="p-3 rounded-lg bg-base-100/70 border border-base-content/10 flex items-start gap-2.5">
          <Icon name="material-symbols:folder-zip-outline-rounded" size="18" class="text-primary mt-0.5 flex-shrink-0" />
          <div class="space-y-1">
            <p class="font-bold text-base-content/90">SSH Key Storage &amp; Auto-Provisioning</p>
            <p class="text-[11px] text-base-content/60 leading-relaxed">
              When a device is approved, the <strong>Default SSH Key</strong> is automatically injected into the node's <code class="font-mono text-primary font-semibold">~/.ssh/authorized_keys</code> for instant 1-click SSH terminal access.
            </p>
          </div>
        </div>

        <!-- Section: Existing Keys -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-base-content/80">Available SSH Key Pairs</span>
            <span class="text-[11px] font-mono text-base-content/50">{{ keys.length }} {{ keys.length === 1 ? 'key' : 'keys' }}</span>
          </div>

          <div v-if="loadingKeys" class="p-4 text-center">
            <span class="loading loading-spinner loading-xs text-primary"></span>
          </div>

          <div v-else-if="keys.length === 0" class="p-4 text-center rounded-lg bg-base-100/50 border border-warning/20 space-y-3">
            <div class="w-10 h-10 rounded-full bg-warning/15 text-warning mx-auto flex items-center justify-center">
              <Icon name="material-symbols:key-off-outline-rounded" size="22" />
            </div>
            <div class="space-y-1">
              <p class="text-xs font-bold text-base-content">No SSH Key Configured</p>
              <p class="text-[11px] text-base-content/60 max-w-sm mx-auto">
                Generate an ed25519 keypair so connecting nodes can automatically receive SSH authorization upon approval.
              </p>
            </div>
            <button 
              @click="generateKey('default')" 
              class="btn btn-primary btn-sm rounded-lg shadow font-semibold gap-1.5 text-xs"
              :disabled="generating"
            >
              <span v-if="generating" class="loading loading-spinner loading-xs"></span>
              <Icon v-else name="material-symbols:vpn-key-rounded" size="16" />
              1-Click Generate Default ed25519 Key
            </button>
          </div>

          <div v-else class="space-y-2">
            <div class="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              <div 
                v-for="key in keys" 
                :key="key"
                class="flex items-center justify-between p-2 rounded-lg bg-base-100 border transition-all"
                :class="defaultKey === key ? 'border-primary/40 bg-primary/5' : 'border-base-content/10'"
              >
                <div class="flex items-center gap-2 font-mono text-xs">
                  <Icon name="material-symbols:key-rounded" :class="defaultKey === key ? 'text-primary' : 'text-base-content/40'" size="16" />
                  <span class="font-bold">{{ key }}</span>
                  <span v-if="defaultKey === key" class="badge badge-primary badge-xs font-sans font-bold px-1.5 py-0.5">DEFAULT</span>
                </div>

                <div class="flex items-center gap-1">
                  <button 
                    v-if="defaultKey !== key"
                    @click="setDefaultKey(key)"
                    class="btn btn-ghost btn-xs text-primary hover:bg-primary/10 rounded-md"
                    title="Set as Default SSH Key for Nodes"
                  >
                    Set Default
                  </button>

                  <button 
                    @click="deleteKey(key)" 
                    class="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-md gap-1"
                    :disabled="deletingKey === key"
                  >
                    <span v-if="deletingKey === key" class="loading loading-spinner loading-xs"></span>
                    <Icon v-else name="material-symbols:delete-outline-rounded" size="14" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Active Default Public Key Box -->
            <div v-if="defaultPublicKey" class="p-2.5 rounded-lg bg-base-100/60 border border-base-content/10 space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-base-content/70">Default Public Key (Auto-injected into Approved Nodes)</span>
                <button @click="copyPublicKey" class="btn btn-ghost btn-xs gap-1 text-[11px] font-semibold text-primary">
                  <Icon :name="copiedKey ? 'material-symbols:check-rounded' : 'material-symbols:content-copy-rounded'" size="13" />
                  {{ copiedKey ? 'Copied!' : 'Copy Key' }}
                </button>
              </div>
              <pre class="p-2 rounded bg-base-300/60 font-mono text-[10px] text-base-content/80 break-all select-all whitespace-pre-wrap">{{ defaultPublicKey }}</pre>
            </div>
          </div>
        </div>

        <div class="divider my-1 opacity-20">Add / Upload Custom Key</div>

        <!-- Section: Add Key Form -->
        <form @submit.prevent="saveKey" class="space-y-3">
          <div class="flex gap-2 items-end">
            <div class="form-control flex-1">
              <label class="label py-1">
                <span class="label-text font-bold text-base-content/80">Key Filename</span>
              </label>
              <input 
                v-model="newFilename" 
                type="text" 
                placeholder="e.g. custom_id_ed25519"
                class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono"
              />
            </div>

            <button 
              type="button" 
              @click="generateKey(newFilename || 'custom_ed25519')" 
              class="btn btn-outline btn-sm rounded-lg font-semibold gap-1 text-xs"
              :disabled="generating"
            >
              <span v-if="generating" class="loading loading-spinner loading-xs"></span>
              <Icon v-else name="material-symbols:auto-awesome-rounded" size="16" class="text-primary" />
              Generate Pair
            </button>
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-bold text-base-content/80">Private Key Content (Or paste existing key)</span>
            </label>
            <textarea
              v-model="newContent"
              rows="3"
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
            <button v-if="newContent.trim()" type="submit" class="btn btn-primary btn-sm rounded-lg shadow font-semibold gap-1" :disabled="saving">
              <span v-if="saving" class="loading loading-spinner loading-xs"></span>
              <Icon v-else name="material-symbols:add-task-rounded" size="16" />
              Save SSH Key
            </button>
          </div>
        </form>
      </div>

      <!-- Tab 3: Security & 2FA -->
      <div v-if="activeTab === 'security'" class="space-y-4 text-xs font-medium">
        <!-- 2FA Status Overview -->
        <div class="p-3.5 rounded-lg border flex items-start gap-3 transition-all"
             :class="twoFactorEnabled ? 'bg-success/10 border-success/30 text-success' : 'bg-warning/10 border-warning/30 text-warning'">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               :class="twoFactorEnabled ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'">
            <Icon :name="twoFactorEnabled ? 'material-symbols:verified-user-rounded' : 'material-symbols:gpp-maybe-rounded'" size="20" />
          </div>
          <div class="space-y-1 flex-1">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-sm text-base-content">
                {{ twoFactorEnabled ? 'Two-Factor Authentication is Active & Enforced' : 'Two-Factor Authentication is Disabled' }}
              </h4>
              <span class="badge badge-xs font-bold font-mono px-2 py-0.5"
                    :class="twoFactorEnabled ? 'badge-success' : 'badge-warning'">
                {{ twoFactorEnabled ? 'ENFORCED' : 'OFF' }}
              </span>
            </div>
            <p class="text-[11px] text-base-content/70 leading-relaxed">
              {{ twoFactorEnabled
                ? 'Your dashboard is protected by Time-based One-Time Password (TOTP) verification. Logins require both the admin password and a 6-digit code from your authenticator app.'
                : 'Protect your ControlCenter dashboard with Google Authenticator, Authy, Apple Passwords, Bitwarden, or 1Password.' }}
            </p>
          </div>
        </div>

        <!-- Section: 2FA is Disabled -> Setup Flow -->
        <div v-if="!twoFactorEnabled" class="space-y-4">
          <div v-if="!showSetupFlow" class="p-4 text-center rounded-lg bg-base-100/60 border border-base-content/10 space-y-3">
            <p class="text-xs text-base-content/70 max-w-md mx-auto leading-relaxed">
              Enable two-factor authentication to prevent unauthorized dashboard access even if your password is compromised.
            </p>
            <button 
              @click="startSetup2fa" 
              class="btn btn-primary btn-sm rounded-lg shadow font-semibold gap-1.5 text-xs"
              :disabled="loading2fa"
            >
              <span v-if="loading2fa" class="loading loading-spinner loading-xs"></span>
              <Icon v-else name="material-symbols:qr-code-scanner-rounded" size="16" />
              Setup Two-Factor Authentication
            </button>
          </div>

          <!-- Active Setup Flow Container -->
          <div v-else class="p-4 rounded-lg bg-base-100 border border-primary/30 space-y-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-base-content/10 pb-2.5">
              <span class="font-bold text-xs text-base-content">Scan QR Code or Enter Secret</span>
              <button @click="showSetupFlow = false" class="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content">
                Cancel Setup
              </button>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-4">
              <!-- QR Code Display -->
              <div class="bg-white p-2 rounded-lg border border-base-content/10 flex-shrink-0 shadow">
                <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="TOTP QR Code" class="w-36 h-36" />
                <div v-else class="w-36 h-36 flex items-center justify-center">
                  <span class="loading loading-spinner loading-md text-primary"></span>
                </div>
              </div>

              <!-- Manual Secret & Instructions -->
              <div class="space-y-2 flex-1 w-full text-xs">
                <p class="text-base-content/80 font-medium leading-relaxed">
                  Scan this QR code with Google Authenticator, Authy, or Apple Passwords.
                </p>
                <div class="p-2 rounded bg-base-300/60 border border-base-content/5 space-y-1">
                  <span class="text-[10px] uppercase font-bold text-base-content/50">Manual Base32 Key</span>
                  <div class="flex items-center justify-between">
                    <code class="font-mono text-xs font-bold text-primary select-all break-all">{{ totpSecret }}</code>
                    <button @click="copySecret" class="btn btn-ghost btn-xs gap-1 text-[11px] font-semibold text-primary">
                      <Icon :name="copiedSecret ? 'material-symbols:check-rounded' : 'material-symbols:content-copy-rounded'" size="13" />
                      {{ copiedSecret ? 'Copied' : 'Copy' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Verification Code Input -->
            <form @submit.prevent="verifyAndEnable2fa" class="space-y-3 pt-2 border-t border-base-content/5">
              <div class="form-control max-w-xs mx-auto">
                <label class="label py-1 justify-center">
                  <span class="label-text font-bold text-xs text-base-content/80">Enter 6-Digit Code from App</span>
                </label>
                <input 
                  v-model="setupTotpCode" 
                  type="text" 
                  maxlength="6"
                  placeholder="000000" 
                  class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-primary font-mono text-center font-bold text-base tracking-[0.3em]"
                  required
                  autofocus
                />
              </div>

              <div class="flex justify-center gap-2 pt-1">
                <button type="button" @click="showSetupFlow = false" class="btn btn-ghost btn-sm rounded-lg">Cancel</button>
                <button 
                  type="submit" 
                  class="btn btn-primary btn-sm rounded-lg shadow font-semibold gap-1"
                  :disabled="loading2fa || setupTotpCode.trim().length < 6"
                >
                  <span v-if="loading2fa" class="loading loading-spinner loading-xs"></span>
                  <Icon v-else name="material-symbols:verified-user-rounded" size="16" />
                  Verify &amp; Activate 2FA
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Section: 2FA is Enabled -> Disable Flow -->
        <div v-else class="space-y-4">
          <div v-if="!showDisableFlow" class="p-4 rounded-lg bg-base-100/60 border border-base-content/10 flex items-center justify-between gap-4">
            <div class="space-y-0.5">
              <h4 class="font-bold text-xs text-base-content">Disable Two-Factor Authentication</h4>
              <p class="text-[11px] text-base-content/60">Turn off TOTP code verification for admin account logins.</p>
            </div>
            <button 
              @click="showDisableFlow = true" 
              class="btn btn-outline btn-error btn-xs rounded-md font-semibold gap-1"
            >
              <Icon name="material-symbols:lock-open-rounded" size="14" />
              Disable 2FA
            </button>
          </div>

          <div v-else class="p-4 rounded-lg bg-base-100 border border-error/30 space-y-3">
            <div class="flex items-center justify-between border-b border-base-content/10 pb-2">
              <span class="font-bold text-xs text-error">Confirm Disabling 2FA</span>
              <button @click="showDisableFlow = false" class="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content">
                Cancel
              </button>
            </div>

            <p class="text-xs text-base-content/70">
              Enter your current 6-digit authenticator code to confirm disabling Two-Factor Authentication:
            </p>

            <form @submit.prevent="confirmDisable2fa" class="space-y-3">
              <div class="form-control max-w-xs">
                <input 
                  v-model="disableCode" 
                  type="text" 
                  maxlength="6"
                  placeholder="000000" 
                  class="input input-sm rounded-lg bg-base-100 border-base-content/10 focus:border-error font-mono text-center font-bold text-base tracking-[0.3em]"
                  required
                  autofocus
                />
              </div>

              <div class="flex gap-2">
                <button 
                  type="submit" 
                  class="btn btn-error btn-sm rounded-lg shadow font-semibold gap-1 text-xs"
                  :disabled="loading2fa || disableCode.trim().length < 6"
                >
                  <span v-if="loading2fa" class="loading loading-spinner loading-xs"></span>
                  <Icon v-else name="material-symbols:delete-forever-rounded" size="16" />
                  Confirm Disable
                </button>
                <button type="button" @click="showDisableFlow = false" class="btn btn-ghost btn-sm rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <div v-if="errorMsg" class="alert alert-error text-xs py-2 rounded-lg">
          <span>{{ errorMsg }}</span>
        </div>

        <div v-if="successMsg" class="alert alert-success text-xs py-2 rounded-lg">
          <span>{{ successMsg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['close', 'keys-updated', 'machines-updated', 'security-updated'])

const activeTab = ref<'devices' | 'ssh' | 'security'>('devices')

// Machines & Device Approvals State
const machines = ref<any[]>([])
const loadingMachines = ref(false)
const processingId = ref<string | null>(null)

const pendingDevices = computed(() => machines.value.filter(m => m.status === 'pending'))
const approvedDevices = computed(() => machines.value.filter(m => m.status !== 'pending'))

const fetchMachines = async () => {
  loadingMachines.value = true
  try {
    const res = await $fetch<any[]>('/api/machines')
    machines.value = res || []
    emit('machines-updated')
  } catch (err: any) {
    console.error('Failed to fetch machines:', err)
  } finally {
    loadingMachines.value = false
  }
}

const approveDevice = async (id: string) => {
  processingId.value = id
  try {
    await $fetch(`/api/machines/${id}/approve`, { method: 'POST' })
    await fetchMachines()
  } catch (err: any) {
    alert(`Failed to approve device: ${err.message}`)
  } finally {
    processingId.value = null
  }
}

const rejectDevice = async (id: string) => {
  if (!confirm('Are you sure you want to remove/reject this device?')) return
  processingId.value = id
  try {
    await $fetch(`/api/machines/${id}`, { method: 'DELETE' })
    await fetchMachines()
  } catch (err: any) {
    alert(`Failed to remove device: ${err.message}`)
  } finally {
    processingId.value = null
  }
}

// SSH Keys State
const keys = ref<string[]>([])
const defaultKey = ref<string | null>(null)
const defaultPublicKey = ref<string | null>(null)
const loadingKeys = ref(false)
const saving = ref(false)
const generating = ref(false)
const deletingKey = ref<string | null>(null)
const newFilename = ref('')
const newContent = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const copiedKey = ref(false)

const fetchKeys = async () => {
  loadingKeys.value = true
  try {
    const res = await $fetch<{ keys: string[]; defaultKey?: string; defaultPublicKey?: string }>('/api/ssh-keys')
    keys.value = res.keys || []
    defaultKey.value = res.defaultKey || null
    defaultPublicKey.value = res.defaultPublicKey || null
    emit('keys-updated')
  } catch (err: any) {
    console.error('Failed to fetch SSH keys', err)
  } finally {
    loadingKeys.value = false
  }
}

const generateKey = async (name: string) => {
  generating.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    const res = await $fetch<any>('/api/ssh-keys/generate', {
      method: 'POST',
      body: { name }
    })
    successMsg.value = `Successfully generated ed25519 key "${res.filename}" and set as Default!`
    newFilename.value = ''
    newContent.value = ''
    await fetchKeys()
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || err.message || 'Failed to generate SSH key pair'
  } finally {
    generating.value = false
  }
}

const setDefaultKey = async (keyName: string) => {
  try {
    await $fetch('/api/ssh-keys', {
      method: 'PUT',
      body: { defaultKey: keyName }
    })
    await fetchKeys()
  } catch (err: any) {
    alert(`Failed to set default key: ${err.message}`)
  }
}

const copyPublicKey = () => {
  if (defaultPublicKey.value) {
    navigator.clipboard.writeText(defaultPublicKey.value)
    copiedKey.value = true
    setTimeout(() => {
      copiedKey.value = false
    }, 2000)
  }
}

const saveKey = async () => {
  if (!newContent.value.trim()) return
  errorMsg.value = ''
  successMsg.value = ''
  saving.value = true

  try {
    await $fetch('/api/ssh-keys', {
      method: 'POST',
      body: {
        filename: newFilename.value || 'custom_key',
        content: newContent.value,
        makeDefault: keys.value.length === 0
      }
    })
    successMsg.value = `SSH key saved successfully!`
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

// 2FA Security State & Actions
const twoFactorEnabled = ref(false)
const showSetupFlow = ref(false)
const showDisableFlow = ref(false)
const loading2fa = ref(false)
const qrCodeUrl = ref('')
const totpSecret = ref('')
const setupTotpCode = ref('')
const disableCode = ref('')
const copiedSecret = ref(false)

const fetch2faStatus = async () => {
  try {
    const res = await $fetch<any>('/api/auth/status')
    twoFactorEnabled.value = !!res.twoFactorEnabled
  } catch (err) {
    console.error('Failed to fetch 2FA status:', err)
  }
}

const startSetup2fa = async () => {
  loading2fa.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const res = await $fetch<any>('/api/2fa/setup')
    qrCodeUrl.value = res.qrCodeUrl
    totpSecret.value = res.secret
    setupTotpCode.value = ''
    showSetupFlow.value = true
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || 'Failed to initialize 2FA setup'
  } finally {
    loading2fa.value = false
  }
}

const copySecret = () => {
  if (totpSecret.value) {
    navigator.clipboard.writeText(totpSecret.value)
    copiedSecret.value = true
    setTimeout(() => {
      copiedSecret.value = false
    }, 2000)
  }
}

const verifyAndEnable2fa = async () => {
  if (!setupTotpCode.value || setupTotpCode.value.trim().length < 6) return
  loading2fa.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    await $fetch('/api/2fa/enable', {
      method: 'POST',
      body: {
        secret: totpSecret.value,
        code: setupTotpCode.value.trim()
      }
    })

    twoFactorEnabled.value = true
    showSetupFlow.value = false
    setupTotpCode.value = ''
    successMsg.value = 'Two-Factor Authentication enabled successfully!'
    emit('security-updated')
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || 'Invalid verification code'
  } finally {
    loading2fa.value = false
  }
}

const confirmDisable2fa = async () => {
  if (!disableCode.value || disableCode.value.trim().length < 6) return
  loading2fa.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    await $fetch('/api/2fa/disable', {
      method: 'POST',
      body: {
        code: disableCode.value.trim()
      }
    })

    twoFactorEnabled.value = false
    showDisableFlow.value = false
    disableCode.value = ''
    successMsg.value = 'Two-Factor Authentication disabled successfully.'
    emit('security-updated')
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || 'Invalid 2FA code'
  } finally {
    loading2fa.value = false
  }
}

onMounted(() => {
  fetchMachines()
  fetchKeys()
  fetch2faStatus()
})
</script>
