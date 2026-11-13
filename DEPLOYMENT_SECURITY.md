# Deployment security configuration

## Required production environment variables

Configure these in the Vercel project under **Settings → Environment Variables**:

- `DATABASE_URL`: PostgreSQL connection string for the production database.
- `AUTH_SECRET`: a private random secret with at least 32 characters. Generate one with `openssl rand -base64 48`. Set it for Production, Preview, and Development as appropriate. Do not prefix it with `NEXT_PUBLIC_`, commit it, or reuse the old public/fallback value.
- `CRON_SECRET`: a separate private random secret used by the appointment-reminders workflow. It must match the GitHub Actions repository secret.
- `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and optional `BOOTSTRAP_ADMIN_NAME`: used only once when a production database is empty to create its first admin. Use a unique password of at least 12 characters, then remove the bootstrap password variable after the admin has been created.

After setting a new `AUTH_SECRET`, existing sessions signed with the previous fallback key will no longer work; users will need to sign in again.

## Database connection capacity

The application caps each Node.js process pool at five connections. On serverless deployments, total possible database connections still scale with the number of active function instances. Use the database provider's pooled connection URL / pooler for production workloads and set sensible provider-side connection limits.

## Security notes

- Login failures are limited per normalized email and source IP using PostgreSQL-backed counters (8 failures per 15-minute window).
- Generic API failures return a generic message; detailed errors remain in server logs.
- Security response headers are configured in `next.config.ts`.
- Do not use the CI-only `AUTH_SECRET` value in Vercel.

## GitHub Actions secrets

The appointment-reminders workflow also needs the repository secrets `EVIDA_APP_URL` (the production URL, for example `https://evida-clinicc-omega.vercel.app`) and `CRON_SECRET` (the same value configured in Vercel). Keep both private.

## Existing production data

The production bootstrap no longer creates the sample accounts (`admin@evida.clinic`, `omnia@evida.clinic`, etc.). This does not automatically delete accounts from a database that was already seeded. If the live database was initialized before this change, review the sample accounts in the admin panel/database, change any passwords that were ever shared, and deactivate or delete unused demo profiles only after confirming they contain no real clinic data.
