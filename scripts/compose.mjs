import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { createHmac, randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
mkdirSync('.local', { recursive: true, mode: 0o700 })
const file = '.local/compose.env'
if (!existsSync(file)) {
  const secret = randomBytes(32).toString('hex'),
    key = () => randomBytes(25).toString('hex')
  function jwt(role) {
    const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      payload = Buffer.from(
        JSON.stringify({
          role,
          iss: 'supabase',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 5 * 365 * 86400,
        }),
      ).toString('base64url')
    return (
      head +
      '.' +
      payload +
      '.' +
      createHmac('sha256', secret)
        .update(head + '.' + payload)
        .digest('base64url')
    )
  }
  writeFileSync(
    file,
    Object.entries({
      JWT_SECRET: secret,
      SUPABASE_KEY: jwt('anon'),
      SERVICE_ROLE_KEY: jwt('service_role'),
      PG_PASSWORD: key(),
      DB_RUNTIME_PASSWORD: key(),
      OTP_SECRET: key(),
      COMMITTEE_EMAIL: 'committee@tidepool.test',
      COMMITTEE_PASSWORD: key(),
    })
      .map(([k, v]) => k + '=' + v)
      .join('\n') + '\n',
    { mode: 0o600 },
  )
}
const result = spawnSync('docker', ['compose', '--env-file', file, 'up', '-d', '--build'], {
  stdio: 'inherit',
})
process.exitCode = result.status ?? 1
