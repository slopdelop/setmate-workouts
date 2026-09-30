# Setmate cloud backup

This Worker stores a private snapshot from one source device in D1. The app remains offline first. Phone backup is upload-only, not multi-device synchronization. Cloud data cannot replace phone workouts; a phone restore feature is intentionally absent.

The phone's 256-bit code allows reading and writing its backup. A different 256-bit code gives the dev preview read-only access. D1 stores SHA-256 hashes of these codes. There is no unauthenticated registration endpoint. Credentials are never bundled in the public app or committed to Git.

PUT requests carry an expected revision; D1 updates the snapshot only if that revision still matches. A stale device pauses backup rather than overwriting different cloud data. If a previous upload succeeded but its response was lost, matching cloud content acknowledges that upload without changing local records. Localhost always disables upload, even if supplied a writer code, and downloads into the separate `setmate-dev-v1` storage key. Its original data remains in `setmate-v1`.

After enabling backup, changes upload 1.5 seconds after the last local save while the app is open and online. Local storage holds all unsent changes across restarts. Opening the app or reconnecting triggers another attempt. Temporary failures retry after 30 seconds, increasing to a maximum of five minutes. iOS background/closed-app uploads are not assumed. Reading backup metadata never imports phone data.

## Deployment

Install dependencies with `npm install`. Authenticate with Cloudflare Wrangler, create a D1 database, and set its ID in `wrangler.jsonc`. Apply `schema.sql` remotely. Run `node provision.mjs` once to generate private credentials and a SQL insert containing only hashes; apply `provision.sql` remotely. Never commit either generated file. Deploy with `npm run deploy` and update `dist/cloud-config.js` to the resulting Worker URL.

Keep `local-credentials.json` safe: it contains the phone and read-only dev codes. The private QR/setup page is generated outside this repository. Connect the app instance where real workouts are logged; Safari and the Home Screen app may have separate local storage.

Tests: `npm test` checks authorization, read-only protection, revisions, payload validation and CORS. Additional workspace tests check cloud client isolation and a live D1 round trip with synthetic data only.
