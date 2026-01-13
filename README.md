# hard_75
Hard 75 PWA to help keep track of your challenge. Can add custom tasks to complete everyday.



# Production readiness checklist
- Choose hosting + domain with HTTPS (Netlify, Vercel, GitHub Pages, S3 + CloudFront).
- Generate PNG app icons (192x192, 512x512) plus a maskable icon and update `manifest.json`.
- Add a privacy note/policy if you plan to collect any data beyond local storage.
- Decide on analytics/error tracking (e.g., Sentry) or keep it fully local.
- Add a build pipeline for minification, cache-busting, and asset compression (gzip/brotli).
- Run Lighthouse + manual PWA tests (install, offline, refresh, update flows).
- Validate cross-browser behavior on mobile (iOS Safari, Android Chrome).
- Set up a release/update strategy for the service worker (versioning + user update prompt).
- Prepare a backup/restore guidance for users (export/import instructions).
