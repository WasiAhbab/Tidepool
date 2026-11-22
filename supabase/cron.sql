-- Enable pg_cron, pg_net, and Supabase Vault from Database > Extensions first.
-- Replace the three values below, then run this once in the Supabase SQL Editor.
-- CRON_SECRET must be the same random value set on Vercel as CRON_SECRET.
select vault.create_secret('https://YOUR-PROJECT.vercel.app', 'tidepool_site_url');
select vault.create_secret('https://YOUR-PROJECT.vercel.app', 'tidepool_site_origin');
select vault.create_secret('REPLACE_WITH_THE_VERCEL_CRON_SECRET', 'tidepool_cron_secret');

select cron.schedule(
  'tidepool-maintenance',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'tidepool_site_url') || '/api/v1/internal/maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Origin', (select decrypted_secret from vault.decrypted_secrets where name = 'tidepool_site_origin'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'tidepool_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $$
);
