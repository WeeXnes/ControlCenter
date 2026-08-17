<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="card w-full max-w-md bg-base-200/70 border border-base-content/10 backdrop-blur-xl shadow-xl rounded-xl p-6 space-y-5">
      <!-- Header -->
      <div class="text-center space-y-1.5">
        <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center mb-1">
          <Icon :name="requires2fa ? 'material-symbols:shield-lock-outline-rounded' : 'material-symbols:lock-outline-rounded'" size="22" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight">ControlCenter</h1>
        <p class="text-xs text-base-content/60 font-medium">
          {{ requires2fa ? 'Two-Factor Authentication Check' : 'Enter admin password' }}
        </p>
      </div>

      <!-- Error Alert -->
      <transition name="fade">
        <div v-if="errorMsg" class="alert alert-error text-xs rounded-lg py-2 px-3 font-medium flex items-center gap-2">
          <Icon name="material-symbols:error-outline-rounded" size="16" />
          <span>{{ errorMsg }}</span>
        </div>
      </transition>

      <!-- Step 1: Password Form -->
      <form v-if="!requires2fa" @submit.prevent="handleLogin" class="space-y-4">
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-xs text-base-content/80">Admin Password</span>
          </label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••••••"
            class="input w-full rounded-lg bg-base-100/70 border-base-content/10 focus:border-primary px-3 font-mono text-xs"
            autofocus
          />
        </div>

        <button 
          type="submit" 
          class="btn btn-primary w-full rounded-lg shadow-md font-semibold text-xs"
          :disabled="loading"
        >
          <span v-if="loading" class="loading loading-spinner loading-xs"></span>
          <span v-else class="flex items-center gap-1.5">
            Authenticate
            <Icon name="material-symbols:arrow-forward-rounded" size="16" />
          </span>
        </button>
      </form>

      <!-- Step 2: 2FA TOTP Form -->
      <form v-else @submit.prevent="handleVerify2fa" class="space-y-4">
        <div class="form-control">
          <label class="label py-1 flex justify-between items-center">
            <span class="label-text font-bold text-xs text-base-content/80">6-Digit Security Code</span>
            <span class="text-[10px] text-base-content/50 uppercase font-mono">Authenticator</span>
          </label>
          <input
            v-model="totpCode"
            type="text"
            required
            maxlength="6"
            placeholder="000000"
            class="input w-full rounded-lg bg-base-100/70 border-base-content/10 focus:border-primary px-3 text-center font-mono font-bold text-lg tracking-[0.4em]"
            autofocus
          />
        </div>

        <div class="space-y-2 pt-1">
          <button 
            type="submit" 
            class="btn btn-primary w-full rounded-lg shadow-md font-semibold text-xs"
            :disabled="loading || totpCode.trim().length < 6"
          >
            <span v-if="loading" class="loading loading-spinner loading-xs"></span>
            <span v-else class="flex items-center gap-1.5">
              Verify Identity
              <Icon name="material-symbols:verified-user-rounded" size="16" />
            </span>
          </button>

          <button 
            type="button" 
            @click="cancel2fa"
            class="btn btn-ghost btn-xs w-full text-base-content/60 hover:text-base-content font-medium"
            :disabled="loading"
          >
            Back to Password
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const password = ref('')
const totpCode = ref('')
const requires2fa = ref(false)
const tempToken = ref('')
const loading = ref(false)
const errorMsg = ref('')
const router = useRouter()

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<any>('/api/auth/login', {
      method: 'POST',
      body: { password: password.value }
    })

    if (res.requires2fa) {
      requires2fa.value = true
      tempToken.value = res.tempToken
      totpCode.value = ''
    } else if (res.success) {
      router.push('/')
    }
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || 'Invalid admin password'
  } finally {
    loading.value = false
  }
}

const handleVerify2fa = async () => {
  if (!totpCode.value || totpCode.value.trim().length < 6) return
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<any>('/api/2fa/verify-login', {
      method: 'POST',
      body: {
        tempToken: tempToken.value,
        code: totpCode.value.trim()
      }
    })

    if (res.success) {
      router.push('/')
    }
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || 'Invalid 2FA verification code'
  } finally {
    loading.value = false
  }
}

const cancel2fa = () => {
  requires2fa.value = false
  tempToken.value = ''
  totpCode.value = ''
  errorMsg.value = ''
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>