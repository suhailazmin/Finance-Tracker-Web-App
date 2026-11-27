import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
