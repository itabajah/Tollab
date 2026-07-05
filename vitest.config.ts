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
        // Thin Firebase adapters (SDK glue, side-effectful) stay excluded, but
        // config.ts holds real Zod validation logic with its own test, so count it.
        'src/services/firebase/app.ts',
        'src/services/firebase/auth.ts',
        'src/services/sync/firebaseBackend.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // Global floor: guards every file, including src-root modules (e.g.
        // App.tsx) that the per-layer globs below don't match. Set well under
        // current coverage so today's run passes with room to spare.
        lines: 88,
        branches: 80,
        functions: 78,
        statements: 88,
        // Raised as layers land; final targets set in the hardening phase.
        'src/domain/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
        'src/services/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/store/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/lib/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        // UI layers. Floors sit comfortably below current coverage so a
        // regression toward zero fails the gate without breaking today's run.
        // download.ts is exercised by download.test.ts, so no carve-out needed.
        'src/features/**': { lines: 85, branches: 75, functions: 65, statements: 85 },
        'src/components/**': { lines: 90, branches: 80, functions: 80, statements: 90 },
        'src/hooks/**': { lines: 90, branches: 85, functions: 80, statements: 90 },
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
