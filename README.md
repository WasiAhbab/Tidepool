# Tidepool

The Computer Science Society’s event calendar and door list. Students use an emailed code to reserve a place. Each event has one seat limit shared by registration, the waitlist and the committee workspace. A guest bringing a companion uses two seats.

## Run locally

Start Docker, use Node 22.13 or newer, then run:

```sh
npm ci
npm run setup
npm run dev
```

Open [Tidepool](http://127.0.0.1:3107). The local semester includes workshops, talks, socials and a hackathon. Student codes arrive in [Mailpit](http://127.0.0.1:55434). The committee sign-in for this checkout lives in `.local/committee.json`. Setup keeps the existing semester and credentials when run again.

Organizers publish invitations, set room and registration limits, build the daily programme, export rosters and send announcements. Volunteers have access to the door list and scanner. Administrators also manage membership, delivery failures and audit history. The live API reference is at [/api/docs](http://127.0.0.1:3107/api/docs). The [OpenAPI file](docs/openapi.json) and [database diagram](docs/database.svg) travel with the source.

## Test

Run `npm run lint`, `npm run typecheck`, `npm run format:check` and `npm run test:unit`. With the local servers running, `npm test` exercises the API, including 500 contenders for 100 seats. Run `npm run test:browser` for the Chrome journeys, including offline entry passes. Tests use isolated fixtures in the local Supabase project.

## Deploy

`npm run compose` builds a local rehearsal at http://127.0.0.1:3207 with its own PostgreSQL, Supabase Auth and mail inbox (port 58434). Its credentials live in `.local/compose.env`. It uses development mail and sample events.

For a Vercel deployment, keep the app and its Nest API in the same project. Vercel serves the Next.js pages and runs the API through `src/pages/api/[...path].ts`; leave `API_INTERNAL_URL` unset in Vercel. Local development can keep pointing that variable at the separately running local API.

Apply the forward migrations in `supabase/migrations` to the hosted Supabase project and omit the semester seed. In Supabase SQL Editor, create the API login role and grant its runtime permissions:

```sql
create role tidepool_app login password 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
grant tidepool_runtime to tidepool_app;
```

In Supabase **Connect**, select the **Session pooler** and copy its connection string into Vercel as `DATABASE_URL`. Use the role password above. Set the Vercel Production environment variables `PUBLIC_ORIGIN` (your production `https://…vercel.app` URL), `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY` (the publishable key), `OTP_SECRET`, `CRON_SECRET`, `DB_POOL_MAX=1`, `TRUST_PROXY_HOPS=1`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM`. For Preview deployments, copy the same values except `PUBLIC_ORIGIN`; Preview URLs are detected automatically. Use a newly generated random value of at least 32 characters for each of `OTP_SECRET` and `CRON_SECRET`. For Gmail, use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`, the full Gmail address, and its app password. Keep all secrets in Vercel’s encrypted environment settings, never in source control. `API_PORT` and `API_HOST` are for local development only.

The verification-code email is sent and awaited during its API request. For queued announcements, reminders, and data-retention cleanup, enable `pg_cron`, `pg_net`, and Vault under Supabase **Database → Extensions**, then fill the placeholders in `supabase/cron.sql` and run it once in SQL Editor. Store the same `CRON_SECRET` value in Vercel and Supabase Vault. Supabase will call the protected maintenance endpoint every five minutes. Create the first administrator in Supabase Auth and insert their user ID and the `admin` role into `society.committee` as database owner.

After setting the variables, redeploy on Vercel. Verify `/health/ready`, request a code at a real university inbox, complete event registration, and confirm the attendee pass appears before opening registration to students.
