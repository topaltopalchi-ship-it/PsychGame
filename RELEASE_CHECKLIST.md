# PsychGame Release Checklist

## Release candidate
- Current release scope: Rooms 01-08 observation only.
- Rooms 09-20 remain reserved for the future specialist-assigned training phase.
- Package version: 0.1.0.

## Required validation
- [ ] `npm install` completes cleanly (the repository currently does not commit a package-lock.json).
- [ ] `npm run build` succeeds.
- [ ] `npm run test:api` succeeds.
- [ ] `npx playwright install --with-deps chromium firefox webkit` succeeds in CI.
- [ ] `npm run test:browser` succeeds on Chromium, Firefox, and WebKit.
- [ ] Full Room 01-08 smoke path reaches the Room 08 ending.
- [ ] Session telemetry persists locally through completion.
- [ ] Upload queue retry, deduplication, partial failure, concurrency, and storage failure tests pass.

## Production configuration
- [ ] `NODE_ENV=production`.
- [ ] `AUTHOR_TOKEN` is set to a strong server-side secret.
- [ ] `CORS_ORIGIN` is the exact production game origin.
- [ ] API and game are served over HTTPS.
- [ ] `VITE_AUTHOR_TOKEN` is not treated as a secret credential.
- [ ] Session storage has appropriate filesystem access controls and backups.
- [ ] Retention policy for behavioral data is defined and enforced operationally.
- [ ] Consent procedure is explicit and appropriate for the deployment context.

## Release boundaries
- [ ] Do not activate Rooms 09-20 as part of the observation release.
- [ ] Do not expose specialist behavioral interpretation or diagnostic conclusions to players.
- [ ] Treat collected behavioral data as sensitive and restrict access accordingly.

## Final release gate
A release is ready only when the validation checks above pass in the target deployment environment and the production configuration has been reviewed.
