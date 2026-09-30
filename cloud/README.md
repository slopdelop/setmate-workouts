# Setmate cloud backup

This Worker stores a private snapshot from one source device in D1. The app remains offline first. This is backup and restore, not multi-device synchronization.

The phone's 256-bit code allows reading and writing its backup. A different 256-bit code gives the dev preview read-only access. D1 stores SHA-256 hashes of these codes. There is no unauthenticated registration endpoint. Credentials are never bundled in the public app or committed to Git.

PUT requests carry an expected revision; D1 updates the snapshot only if that revision still matches. A stale device pauses backup rather than overwriting newer data. Restore on a phone requires confirmation and retains a local recovery copy. Localhost always disables upload, even if supplied a writer code, and downloads into the separate `setmate-dev-v1` storage key. Its original data remains in `setmate-v1`.

After enabling backup, changes upload while the app is open and online. Opening the app or reconnecting triggers another attempt. iOS background/closed-app uploads are not assumed.

## Deployment

Install dependencies with `npm install`. Authenticate with Cloudflare Wrangler, create a D1 database, and set its ID in `wrangler.jsonc`. Apply `schema.sql` remotely. Run `node provision.mjs` once to generate private credentials and a SQL insert containing only hashes; apply `provision.sql` remotely. Never commit either generated file. Deploy with `npm run deploy` and update `dist/cloud-config.js` to the resulting Worker URL.

Keep `local-credentials.json` safe: it contains the phone and read-only dev codes. The private QR/setup page is generated outside this repository. Connect the app instance where real workouts are logged; Safari and the Home Screen app may have separate local storage.

Tests: `npm test` checks authorization, read-only protection, revisions, payload validation and CORS. Additional workspace tests check cloud client isolation and a live D1 round trip with synthetic data only.
