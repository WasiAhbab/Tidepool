import { NextRequest, NextResponse } from 'next/server'
export function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64'),
    dev = process.env.NODE_ENV === 'development'
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'" + (dev ? " 'unsafe-eval'" : ''),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://tile.openstreetmap.org",
    "font-src 'self'",
    "connect-src 'self'" + (dev ? ' ws://127.0.0.1:* ws://localhost:*' : ''),
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  const h = new Headers(req.headers)
  h.set('x-nonce', nonce)
  h.set('Content-Security-Policy', policy)
  const r = NextResponse.next({ request: { headers: h } })
  r.headers.set('Content-Security-Policy', policy)
  return r
}
export const config = {
  matcher: [
    '/((?!api/|health/|_next/|art/|identity/|favicon|icon.svg|manifest.webmanifest|sw.js|offline.html).*)',
  ],
}
