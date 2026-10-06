# PsychGame

PsychGame is an interactive behavioral game platform for professional psychological assessment support.

The game observes natural gameplay behavior rather than presenting psychological questionnaires. Observations are intended for professional interpretation and **are not a clinical diagnosis**.

## Current release

- **Rooms 01-08:** active observation phase.
- **Rooms 09-20:** reserved for a future specialist-assigned training phase and are not part of the current release flow.
- Player-facing gameplay does not display psychological interpretation or diagnostic conclusions.

## What is observed

Depending on the room and interaction, the system can record behavioral signals such as:

- decision timing and choices
- exploration and interaction patterns
- responses to failure
- persistence and retries
- risk-related choices
- help-seeking behavior
- trust and choice switching
- movement and approach/retreat behavior
- repeated interactions
- room completion and progression

These signals are stored as gameplay events and can be aggregated for specialist review.

## Project structure

```text
game/
  src/
    rooms/          # Room implementations
    psychology/     # Behavioral tracking and analysis
    session/        # Session persistence and upload
    training/       # Future specialist-assigned training foundation
    config/         # Runtime feature/config flags

server/             # Small Node.js session ingestion API
tests/              # Playwright browser smoke tests
.github/workflows/  # CI workflows
```

## Local development

Install dependencies:

```bash
npm install
```

Run the game:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run the session API:

```npm
npm run server
```

The API listens on port `8787` by default.

## Configuration

Client-side Vite variables:

- `VITE_PSYCHGAME_MODE` — runtime mode; defaults to `specialist`.
- `VITE_DATA_COLLECTION_ENABLED` — enables local behavioral event collection; defaults to `true`.
- `VITE_DATA_UPLOAD_ENABLED` — enables remote session upload; defaults to `true`.
- `VITE_API_URL` — API endpoint used by the session manager/uploader when configured.
- `VITE_AUTHOR_TOKEN` — optional bearer token sent to the session ingestion API; browser-exposed and not a secret.\n- `VITE_AUTHOR_PANEL_CODE` — optional author-panel gate used by the local/specialist UI. Do not treat it as a production secret; for production, specialist access should be enforced server-side.

Server variables:

- `PORT` — API port; defaults to `8787`.
- `AUTHOR_TOKEN` — bearer token used for session ingestion (`POST /api/sessions`). It is browser-exposed when configured through `VITE_AUTHOR_TOKEN` and is not a secret.\n- `ADMIN_TOKEN` — strong server-only bearer secret required for session reads (`GET /api/sessions` and `GET /api/sessions/:id`). In production, the server refuses to start if it is missing.
- `CORS_ORIGIN` — allowed CORS origin; defaults to `*` for local development. In production, the server refuses to start unless this is set to an exact origin.

If `AUTHOR_TOKEN` is enabled, the client must be configured with the matching token for uploads. Never expose `ADMIN_TOKEN` through any `VITE_*` variable.

## Clinician dashboard

A separate mobile-friendly clinician dashboard is built at `clinician.html`. It is not part of the player UI. The dashboard requires the server-side `ADMIN_TOKEN` and supports patient registration, patient-code/name search, session history, and specialist report viewing.

A specialist can create a patient record, give the generated patient code to the patient, and start the game with `?patientCode=P-xxxxxx`. The game records that assigned code instead of generating a new player code.

**Important:** the dashboard must never receive the ingestion `AUTHOR_TOKEN` and `ADMIN_TOKEN` must never be placed in a `VITE_*` variable. Production clinical use also requires HTTPS, access control, retention policy, consent, and appropriate privacy/legal safeguards.

## Session API

The server exposes:

- `GET /api/health` — public health check.
- `POST /api/sessions` — stores a validated session report.
- `GET /api/sessions?patientCode=...` — returns metadata only for one patient code.
- `GET /api/sessions/:id` — returns a full stored session.
- `POST /api/patients` — creates a protected patient record.
- `GET /api/patients?search=...` — searches protected patient records by name or code.

Session uploads are limited to 2 MB and stored locally in `server/data/sessions.json`. The server keeps the most recent 5,000 session records.

The ingestion endpoint validates the session identifier, player code, and event collection before persistence. Completed records are protected from being overwritten by later progress uploads.

## Behavioral and training boundaries

The observation phase and future training phase are intentionally separated:

- Rooms 01-08 collect observations only.
- Training targets and adaptive training state are designed for Rooms 09-20.
- Training assignments require specialist control.
- Training logic changes difficulty/state; it does not diagnose the player.
- Specialist review remains required before training recommendations are treated as assignments.

## Testing

Browser smoke tests use Playwright and cover the core progression through the currently released rooms.

Run them locally with:

```bash
npx playwright test
```

The CI workflow also builds the application and runs the browser smoke suite on pushes to `main` and on manual dispatch.

## Privacy and interpretation

Gameplay events may contain sensitive behavioral information. Production deployments should use HTTPS, exact-origin CORS, server-side access control, storage protection, retention policies, and explicit consent procedures. The browser-exposed `VITE_AUTHOR_TOKEN` is not a secret and must not be treated as production credentialing.

PsychGame is an assessment-support tool. Its behavioral observations should be interpreted by a qualified professional and must not be presented as an automated clinical diagnosis.
