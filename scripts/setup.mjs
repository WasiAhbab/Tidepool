import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const cli = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const options = { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
const network = 'tidepool_local_only'
try {
  execFileSync('docker', ['network', 'inspect', network], { stdio: 'ignore' })
} catch {
  execFileSync(
    'docker',
    [
      'network',
      'create',
      '--opt',
      'com.docker.network.bridge.host_binding_ipv4=127.0.0.1',
      network,
    ],
    { stdio: 'ignore' },
  )
}
execFileSync(
  cli,
  [
    'supabase',
    'start',
    '--network-id',
    network,
    '-x',
    'realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor',
  ],
  { ...options, stdio: ['ignore', 'ignore', 'inherit'] },
)
execFileSync(cli, ['supabase', 'migration', 'up', '--local'], {
  ...options,
  stdio: ['ignore', 'ignore', 'inherit'],
})
const values = JSON.parse(execFileSync(cli, ['supabase', 'status', '-o', 'json'], options))
const db = new URL(values.DB_URL)
if (!['127.0.0.1', 'localhost'].includes(db.hostname) || db.port !== '55432')
  throw new Error('Expected the dedicated Tidepool development database.')
mkdirSync('.local', { recursive: true, mode: 0o700 })
const accountPath = '.local/committee.json'
const account = existsSync(accountPath)
  ? JSON.parse(readFileSync(accountPath, 'utf8'))
  : {
      email: 'committee-' + randomBytes(5).toString('hex') + '@tidepool.test',
      password: randomBytes(24).toString('base64url'),
    }
if (!existsSync(accountPath))
  writeFileSync(accountPath, JSON.stringify(account, null, 2), { mode: 0o600 })
const admin = createClient(values.API_URL, values.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const dbPool = new pg.Pool({ connectionString: values.DB_URL })
try {
  let user = (await dbPool.query('select id from auth.users where email=$1', [account.email]))
    .rows[0]
  if (!user) {
    const created = await admin.auth.admin.createUser({ ...account, email_confirm: true })
    if (created.error) throw created.error
    user = created.data.user
  }
  await dbPool.query('insert into society.committee(user_id) values($1) on conflict do nothing', [
    user.id,
  ])
  await dbPool.query("update society.committee set role='admin' where user_id=$1", [user.id])
  await dbPool.query(readFileSync('supabase/semester.sql', 'utf8'))
  const role =
    account.email === 'committee@tidepool.test'
      ? 'tidepool_local_api'
      : 'tidepool_local_' + createHash('sha256').update(account.email).digest('hex').slice(0, 12)
  const exists = (await dbPool.query('select 1 from pg_roles where rolname=$1', [role])).rowCount
  const keyPath = '.local/database-password'
  if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(30).toString('hex'), { mode: 0o600 })
  const dbPassword = readFileSync(keyPath, 'utf8').trim()
  if (!/^[a-f0-9]{60}$/.test(dbPassword)) throw new Error('Invalid local database password file.')
  if (!exists)
    await dbPool.query(
      'create role ' + role + " login password '" + dbPassword + "' in role tidepool_runtime",
    )
  db.username = role
  db.password = dbPassword
  if (!existsSync('.env.local'))
    writeFileSync(
      '.env.local',
      [
        'PUBLIC_ORIGIN=http://127.0.0.1:3107',
        'API_PORT=4107',
        'API_INTERNAL_URL=http://127.0.0.1:4107',
        'DATABASE_URL=' + db.href,
        'SUPABASE_URL=' + values.API_URL,
        'SUPABASE_KEY=' + values.ANON_KEY,
        'OTP_SECRET=' + randomBytes(40).toString('hex'),
        'SMTP_HOST=127.0.0.1',
        'SMTP_PORT=55435',
        'MAIL_FROM=Tidepool <events@tidepool.test>',
        'LOCAL_MAILBOX=http://127.0.0.1:55434',
        '',
      ].join('\n'),
      { mode: 0o600 },
    )
  console.log(
    'Tidepool is ready. Run npm run dev. Local committee credentials are in .local/committee.json; student mail arrives at http://127.0.0.1:55434.',
  )
} finally {
  await dbPool.end()
}
