<template>
  <div class="min-h-screen flex flex-col font-sans selection:bg-primary/30" data-theme="onedev">
    <!-- Auth Resolving Loading Screen: Zero flash of dashboard OR login screen -->
    <div v-if="isAuthResolving" class="min-h-screen flex items-center justify-center bg-base-100">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <template v-else>
      <!-- Header / Navbar: Only show when logged in and NOT on auth pages -->
      <header v-if="showNavigation" class="sticky top-0 z-40 transition-all duration-300">
        <nav class="navbar bg-base-100/90 backdrop-blur-xl border-b border-base-content/10 px-4 md:px-8 h-16">
          <div class="flex-1 flex items-center gap-3">
            <NuxtLink to="/" class="group flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div class="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform flex items-center justify-center w-9 h-9">
                <Icon name="material-symbols:space-dashboard-rounded" size="20" />
              </div>
              <span class="text-lg font-bold tracking-tight text-primary">
                Control<span class="text-base-content">Center</span>
              </span>
            </NuxtLink>
          </div>

          <div class="flex items-center gap-3">
            <button 
              v-if="isLoggedIn" 
              @click="showSettingsModal = true" 
              class="btn btn-ghost btn-sm rounded-lg hover:bg-base-content/10 transition-all gap-1.5 text-xs font-semibold"
            >
              <Icon name="material-symbols:settings-outline-rounded" size="16" />
              Settings
            </button>

            <button 
              v-if="isLoggedIn" 
              @click="handleLogout" 
              class="btn btn-ghost btn-sm rounded-lg hover:bg-error/10 hover:text-error transition-all gap-1.5 text-xs font-semibold"
            >
              <Icon name="material-symbols:logout-rounded" size="16" />
              Logout
            </button>
          </div>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="flex-1 overflow-x-hidden">
        <div class="max-w-[1600px] mx-auto w-full px-4 py-6 md:px-8">
          <NuxtPage />
        </div>
      </main>

      <!-- Settings Modal -->
      <SettingsModal 
        v-if="showSettingsModal" 
        @close="showSettingsModal = false" 
      />

      <!-- Footer: Only show when logged in and NOT on auth pages -->
      <footer v-if="showNavigation" class="bg-base-200/30 border-t border-base-content/5 py-4 mt-auto">
        <div class="max-w-[1600px] mx-auto px-4 md:px-8 flex justify-between items-center text-xs text-base-content/40 font-medium">
          <span>ControlCenter</span>
          <span>weexnes.dev</span>
        </div>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const isLoggedIn = ref(false)
const isAuthResolving = ref(true)
const showSettingsModal = ref(false)

const isAuthPage = computed(() => ['/login', '/setup'].includes(route.path))
const showNavigation = computed(() => !isAuthPage.value && isLoggedIn.value)

const checkAuth = async () => {
  try {
    const status = await $fetch<any>('/api/auth/status')
    isLoggedIn.value = status.authenticated
    
    if (!status.onboarded && route.path !== '/setup') {
      router.replace('/setup')
    } else if (status.onboarded && !status.authenticated && route.path !== '/login') {
      router.replace('/login')
    } else if (status.onboarded && status.authenticated && isAuthPage.value) {
      router.replace('/')
    }
  } catch {
    isLoggedIn.value = false
    if (route.path !== '/login' && route.path !== '/setup') {
      router.replace('/login')
    }
  } finally {
    isAuthResolving.value = false
  }
}

const handleLogout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    isLoggedIn.value = false
    router.replace('/login')
  } catch {}
}

watch(() => route.path, () => {
  checkAuth()
}, { immediate: true })

onMounted(() => {
  checkAuth()
})
</script>

<style>
/* Modern Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.15);
  border-radius: 6px;
}
::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.3);
}

/* Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s ease-out;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
