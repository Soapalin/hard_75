# 75 Hard PWA

A bold, offline-ready progressive web app for the 75 Hard challenge. Track daily goals, keep streaks alive, and visualize progress with a calendar grid. Everything stays local to the device unless you export a backup.

## Features
- Daily checklist with per-day goal snapshots to preserve history
- Custom goals with add/remove and one-tap reset to defaults
- Flexible countdown with custom start date and total days
- Streaks, completion rate, and days tracked stats
- Progress grid with day-by-day review and edits
- Day locking to protect past check-ins
- Multiple challenges with quick switching and restarts
- Export/import backup JSON
- Offline support with PWA install and cached assets
- Optional daily reminders (local notifications)

## Production readiness checklist
- Choose hosting + domain with HTTPS (Netlify, Vercel, GitHub Pages, S3 + CloudFront)
- Generate PNG app icons (192x192, 512x512) plus a maskable icon and update `manifest.json`
- Add a privacy note/policy if you plan to collect any data beyond local storage
- Decide on analytics/error tracking (e.g., Sentry) or keep it fully local
- Add a build pipeline for minification, cache-busting, and asset compression (gzip/brotli)
- Run Lighthouse + manual PWA tests (install, offline, refresh, update flows)
- Validate cross-browser behavior on mobile (iOS Safari, Android Chrome)
- Set up a release/update strategy for the service worker (versioning + user update prompt)
- Prepare backup/restore guidance for users (export/import instructions)

## Run locally
```bash
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.
