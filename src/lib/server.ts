import 'server-only'
export function serverFetch(path: string) {
  return fetch((process.env.API_INTERNAL_URL || 'http://127.0.0.1:4107') + '/api/v1/' + path, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
}
