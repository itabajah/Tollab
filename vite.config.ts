import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

/**
 * Dev-only same-origin CORS proxy. In development the importer chain hits
 * `/__cors?url=<target>` first (see src/services/importers/corsProxy.ts); this
 * middleware performs the fetch server-side — where CORS does not apply — with a
 * desktop User-Agent so pages like YouTube return their full ytInitialData.
 *
 * `apply: 'serve'` keeps it out of the built app entirely: production is a
 * static GitHub Pages site, so it falls back to public proxies / VITE_CORS_PROXY.
 *
 * The target host is restricted to the services the importers actually call, so
 * a page open in the dev browser can't turn this into an open proxy / SSRF into
 * the dev machine's localhost or intranet (the response carries ACAO: *).
 */
const ALLOWED_PROXY_HOST_SUFFIXES = [
  'cheesefork.cf',
  'youtube.com',
  'youtu.be',
  'googlevideo.com',
  'panopto.com',
  'panopto.eu',
  'technion.ac.il',
]

function isAllowedProxyHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return ALLOWED_PROXY_HOST_SUFFIXES.some((suffix) => h === suffix || h.endsWith(`.${suffix}`))
}

function corsDevProxy(): Plugin {
  return {
    name: 'tollab-cors-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__cors', async (req, res) => {
        const fail = (status: number, message: string) => {
          res.statusCode = status
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(message)
        }
        try {
          const target = new URL(req.url ?? '', 'http://localhost').searchParams.get('url')
          if (!target || !/^https?:\/\//i.test(target)) {
            fail(400, 'Dev CORS proxy: missing or invalid ?url=')
            return
          }
          let targetUrl: URL
          try {
            targetUrl = new URL(target)
          } catch {
            fail(400, 'Dev CORS proxy: unparseable ?url=')
            return
          }
          if (!isAllowedProxyHost(targetUrl.hostname)) {
            fail(403, `Dev CORS proxy: host not allowed (${targetUrl.hostname})`)
            return
          }
          const upstream = await fetch(target, {
            redirect: 'follow',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          })
          const body = Buffer.from(await upstream.arrayBuffer())
          res.statusCode = upstream.status
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader(
            'Content-Type',
            upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8',
          )
          res.end(body)
        } catch (err) {
          fail(502, `Dev CORS proxy failed: ${err instanceof Error ? err.message : String(err)}`)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), corsDevProxy()],
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
