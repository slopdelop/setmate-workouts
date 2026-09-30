# Setmate

A mobile-first, offline workout log for you and Mabel. No backend, login, analytics, or external dependencies. Machines and workout records stay in browser storage on the device; they are never included in this repository or sent to GitHub.

## Use

Choose a person, filter or add a machine, then enter weight and optionally reps. Previous workout sets can be tapped to reuse their numbers. Pounds and kilograms are supported. A service worker caches the complete app for offline use after the first successful load.

On iPhone, open the published GitHub Pages URL in Safari, choose Share → Add to Home Screen, and keep Open as Web App enabled if shown. Wait for the app to say **Ready offline** before going offline.

Data does not sync between devices. Clearing website data removes records. Safari, the installed Home Screen app, and local previews can have separate storage. Log actual workouts in the installed app.

## Local preview

Run `node server.cjs` and open `http://127.0.0.1:4173/`.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes `dist/` on pushes to `main`. In the repository's Settings → Pages, select GitHub Actions as the publishing source. All asset URLs and the manifest are relative, so the app works under a repository subdirectory.
