# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately via GitHub's **“Report a vulnerability”** (Security → Advisories) on this repository, or by email to the maintainer. Please do not open a public issue for undisclosed vulnerabilities. We aim to acknowledge reports within a few days.

## Scope & design notes

Tollab is a client-side, per-user web app. A few things that look like findings but are by design:

- **The Firebase web API key in the bundle is not a secret.** It is a public client identifier for a Firebase web app. Access control is enforced by the Realtime Database security rules (`database.rules.json`) plus Google Auth — each account can read/write only `tollab/users/<uid>/data`. The key alone grants nothing.
- **CORS proxies for imports.** Import features (Cheesefork ICS, YouTube playlists, Panopto folders) route requests through a CORS proxy because those hosts don't send permissive CORS headers. In development this is a same-origin dev-server proxy **restricted to the specific import hosts**. In production the recommended setup is your own host-allowlisted [Cloudflare Worker](workers/cors-proxy/) via `VITE_CORS_PROXY`, so a pasted link transits only infrastructure you control. If that isn't configured, the static build falls back to free **public** proxies (currently `proxy.cors.sh` / allorigins), and a link you paste then transits a third party — so avoid pasting links that embed private tokens, and prefer configuring your own proxy. Catalog enrichment fetches the public Technion dataset from GitHub directly (no proxy).
- **User-provided links** (recording video/slide URLs, homework links) are gated to `http(s)` before being rendered as clickable anchors, so a `javascript:` URL can't execute; embed origins are matched against a Panopto/Technion host allow-list before being placed in an `iframe`.

## Data storage

Your data lives in your browser's `localStorage` and, only if you sign in, in your Firebase Realtime Database under your own user node. Signing out stops sync; clearing site data removes the local copy.
