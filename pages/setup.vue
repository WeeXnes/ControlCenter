<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="card w-full max-w-md bg-base-200/70 border border-base-content/10 backdrop-blur-xl shadow-xl rounded-xl p-6 space-y-5">
      <div class="text-center space-y-1.5">
        <div class="w-10 h-10 rounded-lg bg-secondary/10 text-secondary inline-flex items-center justify-center mb-1">
          <Icon name="material-symbols:shield-person-outline-rounded" size="22" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Initial Setup</h1>
        <p class="text-xs text-base-content/60 font-medium">Configure master admin password</p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" class="alert alert-error text-xs rounded-lg py-2 px-3 font-medium">
        <Icon name="material-symbols:error-outline-rounded" size="16" />
        <span>{{ errorMsg }}</span>
      </div>

      <form @submit.prevent="handleSetup" class="space-y-3.5">
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-xs text-base-content/80">Master Admin Password</span>
          </label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="At least 6 characters"
            class="input w-full rounded-lg bg-base-100/70 border-base-content/10 focus:border-primary px-3 font-mono text-xs"
          />
        </div>

        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-bold text-xs text-base-content/80">Confirm Password</span>
          </label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            placeholder="Repeat admin password"
            class="input w-full rounded-lg bg-base-100/70 border-base-content/10 focus:border-primary px-3 font-mono text-xs"
          />
        </div>

        <button 
          type="submit" 
          class="btn btn-primary w-full rounded-lg shadow-md font-semibold text-xs"
          :disabled="loading"
        >
          <span v-if="loading" class="loading loading-spinner loading-xs"></span>
          Initialize ControlCenter
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')
const router = useRouter()

const handleSetup = async () => {
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.'
    return
  }

  if (password.value.length < 6) {
    errorMsg.value = 'Password must be at least 6 characters long.'
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/auth/setup', {
      method: 'POST',
      body: { password: password.value }
    })

    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { password: password.value }
    })

    router.push('/')
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || 'Failed to complete setup'
  } finally {
    loading.value = false
  }
}
</script>
