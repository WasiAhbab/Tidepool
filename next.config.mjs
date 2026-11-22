export default {
  poweredByHeader: false,
  agentRules: false,
  turbopack: { root: process.cwd() },
  devIndicators: false,
  async rewrites() {
    const host = process.env.API_INTERNAL_URL
    if (!host) return []
    return [
      { source: '/api/docs/:path*', destination: host + '/api/docs/:path*' },
      { source: '/api/docs-json', destination: host + '/api/docs-json' },
      { source: '/health/:path*', destination: host + '/health/:path*' },
      { source: '/api/v1/:path*', destination: host + '/api/v1/:path*' },
      { source: '/api/:path*', destination: host + '/api/v1/:path*' },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}
