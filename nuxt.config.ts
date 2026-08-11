// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  nitro: {
    experimental: {
      websocket: true
    }
  },
  tailwindcss: {
    viewer: false,
  },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'ControlCenter - Cockpit',
      htmlAttrs: {
        lang: 'en',
      },
      link: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon.ico'
        },
      ]
    }
  }
})