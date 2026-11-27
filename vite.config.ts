import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Service worker: keeps the app on the device (opens instantly, works offline) and keeps the
    // last-loaded copy of your data for when there is no signal. Not active in `npm run dev`.
    VitePWA({
      registerType: 'prompt', // a toast offers "Reload" when a new version is deployed
      injectRegister: false, // registered in src/lib/pwa.ts
      manifest: false, // we keep our own public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Database reads: fresh from the network, the last copy when offline or very slow.
            // Sign-in (/auth/v1) is never cached, and the copy is deleted on sign-out (src/lib/pwa.ts).
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\//,
            method: 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'monetra-data',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
              matchOptions: { ignoreVary: true },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    rolldownOptions: {
      output: {
        // Libraries that rarely change get their own files, so an app update only
        // re-downloads Monetra's own code; the browser keeps these cached
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/ },
            { name: 'vendor-supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'vendor-ui', test: /node_modules[\\/](radix-ui|@radix-ui|sonner|lucide-react|cn|class-variance-authority)[\\/]/ },
            {
              name: 'vendor-charts',
              test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|@reduxjs|immer|reselect|react-redux|use-sync-external-store|decimal\.js-light|es-toolkit|eventemitter3|tiny-invariant)[\\/]/,
            },
          ],
        },
      },
    },
  },
})
