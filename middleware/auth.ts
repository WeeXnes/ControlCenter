export default defineNuxtRouteMiddleware(async (to, from) => {
    const user = useCookie('token')
    if (!user.value) {
        return navigateTo('/login')
    }
})
