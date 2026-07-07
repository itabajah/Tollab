# Tollab CORS proxy (Cloudflare Worker)

Tollab imports your schedule and recordings from **Cheesefork**, **YouTube** and
**Panopto**. Those hosts don't send permissive CORS headers, so the browser
can't fetch them directly from the static `tollab.co.il` site — a proxy has to
fetch them server-side and re-serve them with `Access-Control-Allow-Origin`.

The app can fall back to free public proxies, but those rot constantly (timeouts,
`522`s, API-key walls) — which is why imports "keep breaking." **Deploying this
worker once gives you a fast, private proxy you control, and imports stop
breaking.** It's free: Cloudflare's Workers free plan allows 100,000 requests/day,
far more than importing a few semesters needs.

The worker is locked down: it only proxies the Technion/Cheesefork/YouTube/Panopto
hosts (so it can't be abused as an open proxy) and only answers your own site's
origin.

---

## Deploy — Option A: Cloudflare dashboard (no CLI)

1. Sign in at <https://dash.cloudflare.com> (create a free account if needed).
2. **Workers & Pages → Create → Create Worker**. Give it a name, e.g.
   `tollab-cors-proxy`, and click **Deploy**.
3. Click **Edit code**, delete the starter snippet, paste the entire contents of
   [`worker.js`](./worker.js), then **Deploy**.
4. Copy the worker URL shown at the top — it looks like
   `https://tollab-cors-proxy.<your-subdomain>.workers.dev`.

## Deploy — Option B: Wrangler CLI

From this folder:

```bash
npx wrangler login      # opens a browser to authorize (one time)
npx wrangler deploy     # reads wrangler.toml and deploys worker.js
```

Wrangler prints the deployed `*.workers.dev` URL.

---

## Wire it into the app

The app reads a build-time variable `VITE_CORS_PROXY`. The `{url}` placeholder is
replaced with the encoded target.

1. In GitHub: **Settings → Secrets and variables → Actions → Variables → New
   repository variable**:

   - **Name:** `VITE_CORS_PROXY`
   - **Value:** `https://<your-worker>.workers.dev/?url={url}`

   (It's a public URL, so a _Variable_ is fine — it doesn't need to be a Secret.)

2. Re-run the **Deploy to GitHub Pages** workflow (Actions → _Deploy to GitHub
   Pages_ → _Run workflow_). The new build bakes the proxy URL in, and the app
   now tries your worker first, ahead of the public fallbacks.

### Local development

You don't need the worker locally — `pnpm dev` proxies imports through the Vite
dev server (see `vite.config.ts`). To test the worker against your local build,
add `VITE_CORS_PROXY=https://<your-worker>.workers.dev/?url={url}` to `.env.local`.

---

## Customising

- **Allowed target hosts** — edit `ALLOWED_HOST_SUFFIXES` in `worker.js`. Keep it
  in sync with `ALLOWED_PROXY_HOST_SUFFIXES` in the repo's `vite.config.ts`.
- **Allowed caller origins** — edit `ALLOWED_ORIGINS`. Set it to `[]` to allow any
  origin, or add your own domain(s) to lock the worker to your site.
