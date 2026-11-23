export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

type CachedResource = { value: unknown; at: number }
const resourceCache = new Map<string, CachedResource>()
const resourceRequests = new Map<string, Promise<unknown>>()
const resourceFreshFor = 15_000
let resourceGeneration = 0

export function cachedResource<T>(path: string): T | null {
  const entry = resourceCache.get(path)
  return entry ? (entry.value as T) : null
}

export function clearResourceCache() {
  resourceGeneration++
  resourceCache.clear()
  resourceRequests.clear()
}

export function prefetchResource<T>(path: string): Promise<T> {
  const cached = resourceCache.get(path)
  if (cached && Date.now() - cached.at < resourceFreshFor)
    return Promise.resolve(cached.value as T)
  const pending = resourceRequests.get(path)
  if (pending) return pending as Promise<T>
  const generation = resourceGeneration
  const request = api<T>(path)
    .then((value) => {
      if (generation === resourceGeneration) resourceCache.set(path, { value, at: Date.now() })
      return value
    })
    .finally(() => {
      if (resourceRequests.get(path) === request) resourceRequests.delete(path)
    })
  resourceRequests.set(path, request)
  return request
}

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch('/api/v1/' + path, {
    method,
    cache: 'no-store',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok)
    throw new ApiError(data?.message || 'The service is unavailable. Please try again.', res.status)
  if (method !== 'GET') clearResourceCache()
  return data as T
}
export const reason = (e: unknown) =>
  e instanceof Error ? e.message : 'Could not complete the request.'

export async function myPasses() {
  const session = await api<{ guest: boolean }>('auth/session')
  return session.guest
    ? api<{ email: string; passes: import('@/lib/events').Pass[] }>('passes')
    : null
}
