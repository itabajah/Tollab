import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own cacheable chunks. Firebase is by
        // far the largest dependency and only matters for cloud sync.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
