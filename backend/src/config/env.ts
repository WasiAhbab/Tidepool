import { z } from 'zod'
export function required(key: string) {
  const value = z.string().min(1).optional().parse(process.env[key])
  if (!value) throw new Error('Missing configuration: ' + key)
  return value
}
const deploymentOrigin =
  process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? 'https://' + process.env.VERCEL_URL
    : required('PUBLIC_ORIGIN')
export const config = {
  origin: new URL(deploymentOrigin).origin,
  url: required('SUPABASE_URL'),
  key: required('SUPABASE_KEY'),
  secret: required('OTP_SECRET'),
  db: required('DATABASE_URL'),
  from: required('MAIL_FROM'),
}
const smtpHost = required('SMTP_HOST')
const smtpUser = process.env.SMTP_USER?.trim()
const smtpPassword = process.env.SMTP_PASSWORD
if (Boolean(smtpUser) !== Boolean(smtpPassword))
  throw new Error('SMTP_USER and SMTP_PASSWORD must both be configured.')
if (
  process.env.NODE_ENV === 'production' &&
  (!config.origin.startsWith('https://') ||
    config.secret.length < 32 ||
    !smtpUser ||
    !smtpPassword ||
    ['localhost', '127.0.0.1', '::1'].includes(smtpHost.toLowerCase()))
)
  throw new Error(
    'Production requires an HTTPS origin, a strong OTP secret, and authenticated non-local SMTP.',
  )

z.object({
  origin: z.url(),
  url: z.url(),
  key: z.string().min(1),
  secret: z.string().min(32),
  db: z.url(),
  from: z.string().min(3),
}).parse(config)

export const runtime = z
  .object({
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4107),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535),
    RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(365),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(8).default(0),
    DB_POOL_MAX: z.coerce
      .number()
      .int()
      .min(1)
      .max(12)
      .default(process.env.VERCEL ? 1 : 12),
    CRON_SECRET: z.string().min(32).optional(),
  })
  .parse(process.env)

if (process.env.NODE_ENV === 'production' && !runtime.CRON_SECRET)
  throw new Error('Production requires a CRON_SECRET of at least 32 characters.')
