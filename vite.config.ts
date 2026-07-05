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
        // Split heavy vendors into their own cacheable chunks, matching against
        // resolved module ids. The array form missed react-dom's sub-path
        // modules (e.g. react-dom/client), so the renderer leaked into the
        // entry chunk; the id-based form captures the whole runtime.
        manualChunks(id) {
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'react'
          }
          // Firebase is by far the largest dependency and only matters for cloud sync.
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase')) {
            return 'firebase'
          }
        },
      },
    },
  },
})
