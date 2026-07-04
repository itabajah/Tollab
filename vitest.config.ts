import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__fixtures__/**',
        'src/main.tsx',
        'src/services/firebase/**',
        'src/services/sync/firebaseBackend.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // Raised as layers land; final targets set in the hardening phase.
        'src/domain/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
        'src/services/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/store/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/lib/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/{domain,services,store,lib}/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./tests/setup.dom.ts'],
          include: ['src/{features,components,hooks}/**/*.test.{ts,tsx}', 'src/*.test.{ts,tsx}'],
        },
      },
    ],
  },
})
