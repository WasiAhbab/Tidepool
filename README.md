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

For a university deployment, apply the forward migrations in `supabase/migrations` to a Supabase project. Omit the semester seed. Create a login role for the API, grant it `tidepool_runtime`, and use its TLS connection string for `DATABASE_URL`. Create the first administrator in Supabase Auth and insert their user ID and the role `admin` into `society.committee` as database owner.

Set the values in `.env.example` through the host’s secret manager. Use the public HTTPS origin, a private API address, the Supabase publishable key, a fresh OTP signing secret and the society’s verified SMTP sender. Set retention to university policy. Set trusted proxy hops only for a known forwarding chain.

Build the Docker image with `--build-arg API_INTERNAL_URL=http://api:4107`. Run the image twice on that private network, with `npm run start:api` (set `API_HOST=0.0.0.0`) and `npm run start:web`. Terminate HTTPS at the web service. Check `/health/ready`, send a real code to a university inbox, and confirm a pass scans before announcing registration.
