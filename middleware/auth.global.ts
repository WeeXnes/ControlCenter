export default defineNuxtRouteMiddleware(async (to) => {
  try {
    const status = await $fetch<{ onboarded: boolean; authenticated: boolean }>('/api/auth/status')

    // 1. If system is not onboarded, redirect all routes to /setup
    if (!status.onboarded) {
      if (to.path !== '/setup') {
        return navigateTo('/setup')
      }
      return
    }

    // 2. If onboarded but not authenticated, redirect all routes to /login
    if (!status.authenticated) {
      if (to.path !== '/login') {
        return navigateTo('/login')
      }
      return
    }

    // 3. If onboarded AND authenticated, prevent visiting /login or /setup
    if (status.authenticated && (to.path === '/login' || to.path === '/setup')) {
      return navigateTo('/')
    }
  } catch (err) {
    if (to.path !== '/login' && to.path !== '/setup') {
      return navigateTo('/login')
    }
  }
})
