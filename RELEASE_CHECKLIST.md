# PsychGame Release Checklist

## Release candidate
- Current release scope: Rooms 01-08 observation only.
- Rooms 09-20 remain reserved for the future specialist-assigned training phase.
- Package version: 0.1.0.

## Required validation
- [x] `npm install` completes cleanly in CI (the repository intentionally does not commit a package-lock.json).
- [x] `npm run build` succeeds in CI.
- [x] `npm run test:api` succeeds in CI.
- [x] `npx playwright install --with-deps chromium firefox webkit` succeeds in CI.
- [x] Browser smoke succeeds on Chromium, Firefox, and WebKit (Browser Smoke #123).
- [x] Full Room 01-08 smoke path reaches the Room 08 ending (Browser Smoke #123).
- [x] Session telemetry persists locally through completion (Browser Smoke #123).
- [x] Upload queue retry, deduplication, partial failure, concurrency, and storage failure tests pass (Browser Smoke #123).

## Production configuration
- [ ] `NODE_ENV=production` in the target deployment.
- [ ] `AUTHOR_TOKEN` is configured for session ingestion (browser-exposed; not a secret).
- [ ] `CORS_ORIGIN` is the exact production game origin.
- [ ] API and game are served over HTTPS.
- [x] `VITE_AUTHOR_TOKEN` is explicitly documented as a browser-exposed, non-secret token.
- [ ] Session storage has appropriate filesystem access controls and backups.
- [ ] Retention policy for behavioral data is defined and enforced operationally.
- [ ] Consent procedure is explicit and appropriate for the deployment context.

## Release boundaries
- [x] Rooms 09-20 are not part of the current observation release scope.
- [x] Player-facing flow does not expose specialist behavioral interpretation or diagnostic conclusions.
- [ ] `ADMIN_TOKEN` is a strong server-only secret and production access to collected behavioral data is restricted to authorized personnel.

## Final release gate
A release is ready only when the validation checks above pass in the target deployment environment and the production configuration has been reviewed.

### Current verified CI gate
- Release commit: `088caf91cb14faad2507eee557d77c068d8c2026`
- Browser Smoke #123: success
- Deploy #662: success on the same commit
- Last known failing smoke (#121) is superseded by the successful #123 run.
