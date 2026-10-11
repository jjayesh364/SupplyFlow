# AI Help and zero-cost Render demo preparation

## AI Help

SupplyFlow AI Help is an optional, read-only explainer for the synthetic demonstration dataset. It uses the stable Gemini model `gemini-3.1-flash-lite` through Standard inference, with no grounding, tools, or paid fallback. The API key belongs only in the FastAPI process as `GEMINI_API_KEY`; never put it in a `NEXT_PUBLIC_*` variable or browser request.

Before the first question is sent, the UI requires acknowledgement that the question and a small set of relevant synthetic facts will be sent to Google. Do not ask about real, confidential, personal, or sensitive military data. The server rejects common email, phone, UUID, coordinate-pair, and explicit sensitive-data patterns before any provider request; this is a safety filter, not a guarantee that every sensitive phrase can be recognized. The context excludes coordinates and database/record identifiers. Provider prompts and keys are not logged. If the key is absent, the synthetic-only flag is false, the provider times out, or the free quota is exhausted, the assistant reports that it is unavailable and does not try another model or service.

The assistant returns backend facts with their API source separately from the generated explanation. Inventory aggregates and individual inventory-risk records are also returned as structured values so the UI can render names, locations, risk status, days of supply, stock quantities, daily demand, and completeness independently of Gemini's prose. The prose reads only existing inventory risk, shipment status, forecast, and recommendation data. It cannot invoke forecast training, optimization, simulation, SQL, or database writes. It disables itself if relevant source tables contain records not marked synthetic. English, Hindi, Gujarati, Marathi, Punjabi, and Bengali response codes are implemented. Model responses and translation quality have not been exhaustively verified for every language; treat the structured SupplyFlow facts as authoritative.

The Gemini unpaid tier can use prompts and responses to improve Google products, and human reviewers may process them. The account quota was observed in AI Studio on 2026-10-11 for the signed-in Free-tier project: Gemini 3.1 Flash Lite showed 15 RPM, 250,000 TPM, and 500 RPD, with zero observed use over the displayed period. Google may change account limits. Re-check AI Studio before a demo. Current official references: [model](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [terms](https://ai.google.dev/gemini-api/terms).

For local AI use, add `GEMINI_API_KEY` to the ignored root `.env` file only after reviewing Google's unpaid-service data terms. Without that setting, AI Help remains visibly unavailable. Never enable Google Cloud billing for this demo project.

## Render service layout

`render.yaml` prepares two free web services: Next.js and FastAPI. It creates no database resource. The services use the Render-provided `PORT`; the API checks `/api/v1/ping`, while `/api/v1/health` reports database and PostGIS connectivity. The Next.js frontend uses a same-origin `/api/v1/*` rewrite to the FastAPI public URL, so browser requests do not need cross-origin CORS. Set `SUPPLYFLOW_API_ORIGIN` on the Next.js service to the deployed FastAPI URL at build time. Keep `NEXT_PUBLIC_API_URL` empty in Render. Local development can continue using the existing `NEXT_PUBLIC_API_URL=http://localhost:8000` setting.

The API start command runs `alembic upgrade head` before Uvicorn starts. On the target database, first enable PostGIS (`CREATE EXTENSION postgis;`) using the Supabase dashboard or a database administrator session, then deploy/start the API so Alembic can create geometry columns. The initial migration does not enable PostGIS itself. After Alembic completes, verify `/api/v1/health` reports `postgis_installed: true` before using map features. Alembic is versioned and does not seed or clear application rows. **Do not add `python -m app.seed` to a build/start command:** that script resets existing tables before loading demo rows. Apply the seed manually only to a known-empty demo database after verifying its target.

### Supabase Free PostgreSQL/PostGIS setup

Render Free PostgreSQL expires after 30 days, so use an existing or separately created Supabase Free project for the database. This repository does not create that project. Free-plan limits include a 500 MB database quota and projects may pause after seven days of low activity. Keep periodic `pg_dump` exports outside the hosted project; this plan is not a backup guarantee.

1. In the Supabase dashboard, enable the `postgis` extension before the first API start/migration. The schema migration creates PostGIS geometry columns but does not create the extension. Check `/api/v1/health` after migration and confirm PostGIS is installed.
2. Render free services use the public network. For an IPv4-only Render environment, use the Supabase shared **session pooler** connection on port 5432 (not transaction mode): this mode supports prepared statements and is IPv4 reachable. Configure both driver URLs using the same endpoint/credentials:
   - `DATABASE_URL=postgresql+asyncpg://<pooler-user>:<URL-encoded-password>@<pooler-host>:5432/postgres?ssl=require`
   - `SYNC_DATABASE_URL=postgresql+psycopg2://<pooler-user>:<URL-encoded-password>@<pooler-host>:5432/postgres?sslmode=require`
   Copy the actual pooler user and hostname from Supabase Connect; do not guess them. URL-encode reserved characters in the password. Never commit either URL.
3. In Render, use Blueprint review and supply both database URLs, the optional Gemini key, and the API URL requested by the blueprint. Leave Gemini unset to keep AI Help unavailable. Do not enable billing for Gemini.
4. After startup, verify `/api/v1/ping`, then `/api/v1/health`, the frontend, and the AI unavailable/available state. The AI UI discloses data transfer before its first request.

Supabase references: [billing limits](https://supabase.com/docs/guides/platform/billing-on-supabase), [PostGIS extension](https://supabase.com/docs/guides/database/extensions/postgis), [free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Free-tier constraints and safety

Render Free web services sleep after 15 minutes without traffic, take roughly a minute to wake, use ephemeral filesystems, and share 750 monthly instance hours per workspace. The two services therefore suit an intermittent demonstration, not a reliable always-on site. Render Free PostgreSQL expires 30 days after creation. These policies are described in [Render's free plan documentation](https://render.com/docs/free).

The public FastAPI service still exposes existing read APIs. With `DEMO_READ_ONLY_MODE=true`, forecast training and optimization endpoints reject requests before reaching their write services. This gate is off by default locally, preserving existing development behavior. Route planning and What-If simulation remain available as non-persisting calculations. The AI endpoint has no path to any of these operations.

No cloud resources were created, and nothing was deployed.
