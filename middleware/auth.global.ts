import { defineNuxtRouteMiddleware, navigateTo, useRequestFetch, useState } from 'nuxt/app';

export default defineNuxtRouteMiddleware(async (to) => {
  const isAuthPage = ['/login', '/setup'].includes(to.path);
  const authState = useState<{ authenticated: boolean; onboarded: boolean }>('authState', () => ({
    authenticated: false,
    onboarded: false
  }));

  const fetch = useRequestFetch();

  try {
    const status = await fetch<any>('/api/auth/status');
    authState.value = {
      authenticated: !!status.authenticated,
      onboarded: !!status.onboarded
    };

    if (!status.onboarded && to.path !== '/setup') {
      return navigateTo('/setup');
    }

    if (status.onboarded && !status.authenticated && !isAuthPage) {
      return navigateTo('/login');
    }

    if (status.onboarded && status.authenticated && isAuthPage) {
      return navigateTo('/');
    }
  } catch (err) {
    authState.value.authenticated = false;
    if (!isAuthPage) {
      return navigateTo('/login');
    }
  }
});
