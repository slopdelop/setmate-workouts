# Setmate

A mobile-first, offline workout log for Justin and Mabel. No backend, login, analytics, or external dependencies. The requested starting September notebook is bundled in the public app. New workout entries stay in browser storage on the device and are never uploaded.

## Use

Choose a person, filter or add a machine, then enter weight and optionally reps. Previous workout sets can be tapped to reuse their numbers. Pounds and kilograms are supported. A service worker caches the complete app for offline use after the first successful load.

Profiles are Justin and Mabel. Existing records labeled You migrate to Justin automatically. Machines are sorted by the selected person's oldest last-use date, with unused machines first. Hide a machine from its detail view, then use Show hidden machines to restore it; history is preserved.

The full machine catalog is available on every installation, including HOIST machines. HOIST machines carry the supplied logo next to their names and keep separate histories from other machines with the same name. Filters are All, Upper body, and Lower body; abs appears in both body groups. HOIST quick weights and +/- controls use previously recorded values rather than assume uniform increments. Other-machine suggestions use the last weight with adjacent 5 lb / 2.5 kg values. The weight field always accepts custom values.

New devices automatically start with 147 sets and 19 machines from the September notebook in `dist/default-data.js`. Older installations with an empty history receive the defaults once; installations with saved workouts keep their existing records. Estimated handwriting is labeled in workout history.

Use the information button → Reset to default data to restore the starting notebook. A confirmation dialog is required before replacing records; Cancel leaves them unchanged. Reset removes added workouts, added machines, and hidden-machine choices and returns the profile and units to Justin and pounds.

The information menu also contains installation instructions and optional Import workout file. Imports validate before saving and skip already imported set IDs.

On iPhone, open the published GitHub Pages URL in Safari, choose Share → Add to Home Screen, and keep Open as Web App enabled if shown. Wait for the app to say **Ready offline** before going offline.

Data does not sync between devices. Clearing website data removes records. Safari, the installed Home Screen app, and local previews can have separate storage. Log actual workouts in the installed app.

## Local preview

Run `node server.cjs` and open `http://127.0.0.1:4173/`.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes `dist/` on pushes to `main`. In the repository's Settings → Pages, select GitHub Actions as the publishing source. All asset URLs and the manifest are relative, so the app works under a repository subdirectory.
