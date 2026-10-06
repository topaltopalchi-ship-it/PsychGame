# API Deployment Template

This repository publishes the browser application through GitHub Pages. The Node session API is deployed separately.

## Container

Use `Dockerfile.api` to run the API on a Docker-capable Node hosting service.

The container expects:

- `NODE_ENV=production`
- `AUTHOR_TOKEN` — browser-exposed ingestion token
- `ADMIN_TOKEN` — server-only read/admin token
- `CORS_ORIGIN` — exact HTTPS game origin
- `PORT` — normally `8787`
- `DATA_DIR` — persistent mounted storage; the supplied container defaults to `/data`

Mount a persistent volume at `/data`. Do not use ephemeral container storage for behavioral session records.

## Frontend

Build the GitHub Pages frontend with:

- `VITE_API_URL` — HTTPS URL of the deployed API
- `VITE_AUTHOR_TOKEN` — value matching the API's `AUTHOR_TOKEN`

Never provide `ADMIN_TOKEN` as a `VITE_*` variable.

## Production verification

Before marking the release gate complete:

1. Open `GET /api/health` through the public HTTPS API URL.
2. Verify browser session upload succeeds with the ingestion token.
3. Verify the ingestion token cannot read `GET /api/sessions`.
4. Verify the admin token can read session data.
5. Restart/redeploy the API and verify stored sessions remain on the persistent volume.
6. Verify `CORS_ORIGIN` matches the exact GitHub Pages origin.
7. Confirm backups, retention, and authorized access procedures.

The repository does not select a hosting provider or contain production credentials.
