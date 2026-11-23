import 'server-only'
import { apiUrl } from './site'
export function serverFetch(path: string) {
  return fetch(apiUrl(path), {
    next: { revalidate: 5 },
    signal: AbortSignal.timeout(8000),
  })
}
