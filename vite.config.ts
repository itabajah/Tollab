/// <reference types="vitest" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';
import type { Plugin } from 'vite';

/** Inject CSP meta tag only in production builds (Vite dev needs unsafe-eval for HMR). */
function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.server) return html; // dev mode — skip CSP
        const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://*.googleapis.com https://*.firebaseapp.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://api.codetabs.com https://corsproxy.org https://api.allorigins.win https://raw.githubusercontent.com; frame-src https://www.youtube.com https://*.panopto.com https://*.panopto.eu; object-src 'none'; base-uri 'self';" />`;
        return html.replace('</head>', `    ${csp}\n  </head>`);
      },
    },
  };
}

export default defineConfig({
  plugins: [preact(), cspPlugin()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules') && (id.includes('firebase') || id.includes('@firebase'))) {
            return 'firebase';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/unit/**/*.{test,spec}.{ts,tsx}', 'tests/integration/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
    },
  },
});
