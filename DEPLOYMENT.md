# PsychGame Production Deployment

## Required environment

Set these server-side before starting the API:

- `NODE_ENV=production`
- `AUTHOR_TOKEN` — strong random bearer secret; never commit it.
- `CORS_ORIGIN` — exact public game origin.
- `PORT` — normally 8787 behind the reverse proxy.
- `DATA_DIR` — persistent directory for session storage.

The browser variable `VITE_AUTHOR_TOKEN` is not a secret. It is exposed to players and must not be treated as server credentialing.

## HTTPS and proxy

The Node API currently serves HTTP. Production TLS should terminate at the deployment's HTTPS reverse proxy/load balancer, with the API kept on the private/local network where possible.

The public game origin must match `CORS_ORIGIN` exactly.

## Session data

The API stores sessions in `DATA_DIR/sessions.json` and retains the newest 5,000 records.

Before release:

1. Put the session directory on persistent storage.
2. Restrict filesystem permissions so only the API service account can read/write it.
3. Configure encrypted backups appropriate to the sensitivity of behavioral data.
4. Define and enforce a retention/deletion policy.
5. Restrict production API access to authorized personnel.

## Consent

The deployment must have an explicit consent procedure appropriate to the deployment context before behavioral data collection begins.

## Release gate

Release is approved only after the operator verifies:

- production environment variables are set;
- HTTPS is active;
- exact-origin CORS works;
- session storage and backups are protected;
- behavioral-data retention is configured;
- consent is in place;
- authorized personnel are the only users with access to session data;
- CI Browser Smoke and deployment checks are green for the release commit.
