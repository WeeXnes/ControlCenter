import { useCookie } from '#app';
import { navigateTo } from 'nuxt/app';

export default defineNuxtRouteMiddleware(async (to, from) => {
    const token = useCookie('token');
    if (!token.value) {
        return navigateTo('/login');
    }

    try {
        const data = await $fetch<any>('/api/user');
        const roles = data?.user?.roles || [];
        if (!roles.includes('Owner') && !roles.includes('Moderator')) {
            return navigateTo('/');
        }
    } catch (e) {
        console.warn("Admin middleware navigation check failed:", e);
        return navigateTo('/');
    }
});
