# PsychGame Cloudflare API

This Worker is the zero-cost production API target for session ingestion and specialist/admin reads.

## Storage
Cloudflare D1 stores session records. Apply schema.sql to the D1 database before deployment.

## Secrets
Configure these as Worker secrets; never put them in wrangler.toml or VITE_* variables:
- AUTHOR_TOKEN — bearer token for POST /api/sessions
- ADMIN_TOKEN — server-side bearer token for session reads

CORS_ORIGIN must be the exact GitHub Pages origin.

## Deploy
1. Create a D1 database named psychgame-sessions.
2. Put its real database_id into wrangler.toml.
3. Set the real GitHub Pages origin in CORS_ORIGIN.
4. Apply schema.sql to the production D1 database.
5. Set AUTHOR_TOKEN and ADMIN_TOKEN with Wrangler secrets.
6. Deploy the Worker.
7. Verify health, ingestion, unauthorized reads, and authorized admin reads.
8. Set frontend VITE_API_URL to the Worker origin and VITE_AUTHOR_TOKEN to the ingestion token.

Do not commit real tokens or production database IDs.
