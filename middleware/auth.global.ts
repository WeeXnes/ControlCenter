import { useCookie } from '#app'
import { navigateTo } from 'nuxt/app'

export default defineNuxtRouteMiddleware(async (to) => {
  // Allow login and setup pages to render without redirection loops
  if (to.path === '/login' || to.path === '/setup') {
    return
  }

  const token = useCookie('token')
  if (!token.value) {
    return navigateTo('/login')
  }
})
