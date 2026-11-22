export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
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
