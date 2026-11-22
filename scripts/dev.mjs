import { createServer } from 'node:net'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

if (!existsSync('.env.local'))
  throw new Error('Run npm run setup before starting the development servers.')
process.loadEnvFile('.env.local')
const origin = new URL(process.env.PUBLIC_ORIGIN)
const host = '127.0.0.1'
const ports = [Number(origin.port) || 80, Number(process.env.API_PORT) || 4107]
const lock = '.local/dev-process.json'
mkdirSync('.local', { recursive: true, mode: 0o700 })
function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
if (existsSync(lock)) {
  let saved
  try {
    saved = JSON.parse(readFileSync(lock, 'utf8'))
  } catch {}
  if (saved && alive(saved.pid)) {
    console.log('Tidepool is already starting or running at ' + saved.origin)
    process.exit(0)
  }
  unlinkSync(lock)
}
writeFileSync(lock, JSON.stringify({ pid: process.pid, origin: origin.origin }), {
  flag: 'wx',
  mode: 0o600,
})
process.on('exit', () => {
  if (existsSync(lock)) unlinkSync(lock)
})
for (const port of ports) {
  const free = await new Promise((resolve) => {
    const socket = createServer()
    socket.once('error', () => resolve(false))
    socket.listen(port, host, () => socket.close(() => resolve(true)))
  })
  if (!free) {
    console.error(
      'Port ' +
        port +
        ' is in use. Inspect the listener with lsof -nP -iTCP:' +
        port +
        ' -sTCP:LISTEN. Stop its original terminal or choose another port in .env.local.',
    )
    process.exit(1)
  }
}
const req = createRequire(import.meta.url)
const children = [
  spawn(
    process.execPath,
    [req.resolve('next/dist/bin/next'), 'dev', '--hostname', host, '--port', String(ports[0])],
    { stdio: 'inherit' },
  ),
  spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:api'], {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  }),
]
let finishing = false
function stop(code) {
  if (finishing) return
  finishing = true
  process.exitCode = code
  for (const [i, child] of children.entries())
    if (child.exitCode === null && !child.signalCode) {
      try {
        if (i === 1 && process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM')
        else child.kill('SIGTERM')
      } catch {}
    }
}
for (const child of children) {
  child.once('error', () => stop(1))
  child.once('exit', (code) => stop(code ?? 0))
}
process.once('SIGTERM', () => stop(0))
process.once('SIGINT', () => stop(0))
