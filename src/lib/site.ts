export function siteOrigin() {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL)
    return 'https://' + process.env.VERCEL_URL
  if (process.env.PUBLIC_ORIGIN) return new URL(process.env.PUBLIC_ORIGIN).origin
  if (process.env.VERCEL_URL) return 'https://' + process.env.VERCEL_URL
  return 'http://127.0.0.1:3107'
}

export function apiUrl(path: string) {
  const host = (process.env.API_INTERNAL_URL || siteOrigin()).replace(/\/$/, '')
  if (path.startsWith('/')) return host + path
  return host + '/api/v1/' + path
}
