import 'server-only'
import { apiUrl } from './site'
export function serverFetch(path: string) {
  return fetch(apiUrl(path), {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
}
