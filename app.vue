<template>
  <div class="min-h-screen flex flex-col font-sans selection:bg-primary/30" data-theme="onedev">
    <!-- Header / Navbar: Strictly shown when authenticated and NOT on auth pages -->
    <header v-if="showNavigation" class="sticky top-0 z-40 transition-all duration-300">
      <nav class="navbar bg-base-100/90 backdrop-blur-xl border-b border-base-content/10 px-4 md:px-8 h-16">
        <div class="flex-1 flex items-center gap-6">
          <NuxtLink to="/" class="group flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div class="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform flex items-center justify-center w-9 h-9">
              <Icon name="material-symbols:space-dashboard-rounded" size="20" />
            </div>
            <span class="text-lg font-bold tracking-tight text-primary">
              Control<span class="text-base-content">Center</span>
            </span>
          </NuxtLink>

          <!-- Navigation Tabs -->
          <div class="hidden sm:flex items-center gap-1 bg-base-200/60 p-1 rounded-lg border border-base-content/5 text-xs font-semibold">
            <NuxtLink 
              to="/" 
              class="px-3 py-1 rounded-md transition-all flex items-center gap-1.5"
              :class="route.path === '/' ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/70 hover:text-base-content hover:bg-base-content/5'"
            >
              <Icon name="material-symbols:dns-outline-rounded" size="15" />
              Machines
            </NuxtLink>

            <NuxtLink 
              to="/topology" 
              class="px-3 py-1 rounded-md transition-all flex items-center gap-1.5"
              :class="route.path === '/topology' ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/70 hover:text-base-content hover:bg-base-content/5'"
            >
              <Icon name="material-symbols:bubble-chart-outline-rounded" size="15" />
              Infrastructure Graph
            </NuxtLink>

            <NuxtLink 
              to="/notifications" 
              class="px-3 py-1 rounded-md transition-all flex items-center gap-1.5"
              :class="route.path === '/notifications' ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/70 hover:text-base-content hover:bg-base-content/5'"
            >
              <Icon name="material-symbols:notifications-active-rounded" size="15" />
              Alert Rules
            </NuxtLink>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button 
            v-if="isLoggedIn" 
            @click="showSettingsModal = true" 
            class="btn btn-ghost btn-sm rounded-lg hover:bg-base-content/10 transition-all gap-1.5 text-xs font-semibold relative"
          >
            <Icon name="material-symbols:settings-outline-rounded" size="16" />
            Settings
            <span v-if="pendingApprovalsCount > 0" class="badge badge-warning badge-xs font-mono font-bold px-1.5 py-0.5 animate-pulse">
              {{ pendingApprovalsCount }}
            </span>
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
      <div :class="isAuthPage ? '' : 'max-w-[1600px] mx-auto w-full px-4 py-6 md:px-8'">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const showSettingsModal = ref(false)
const pendingApprovalsCount = ref(0)

const authState = useState<{ authenticated: boolean; onboarded: boolean }>('authState', () => ({
  authenticated: false,
  onboarded: false
}))

const isAuthPage = computed(() => ['/login', '/setup'].includes(route.path))
const isLoggedIn = computed(() => authState.value.authenticated)
const showNavigation = computed(() => !isAuthPage.value && isLoggedIn.value)

const checkPendingApprovals = async () => {
  if (!isLoggedIn.value) return
  try {
    const list = await $fetch<any[]>('/api/machines')
    pendingApprovalsCount.value = (list || []).filter(m => m.status === 'pending').length
  } catch {}
}

const handleLogout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    authState.value.authenticated = false
    router.replace('/login')
  } catch {}
}

onMounted(() => {
  if (isLoggedIn.value) {
    checkPendingApprovals()
  }
  const interval = setInterval(() => {
    if (isLoggedIn.value) {
      checkPendingApprovals()
    }
  }, 5000)
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
