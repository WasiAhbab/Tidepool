import { createApplication } from './application'
import { Database } from './database/database'
import { deliverQueuedMail } from './mail/worker'
import { maintain } from './mail/jobs'
import { log } from './common/errors'

async function main() {
  const app = await createApplication()
  const db = app.get(Database)
  let sending = false
  setInterval(async () => {
    if (sending) return
    sending = true
    try {
      await deliverQueuedMail(db)
    } catch {
      console.error('Mail queue temporarily unavailable.')
    } finally {
      sending = false
    }
  }, 3000).unref()
  const jobs = () => maintain(db).catch(() => log.error('Scheduled maintenance deferred'))
  await jobs()
  setInterval(jobs, 60000).unref()
  await app.listen(Number(process.env.API_PORT || 4107), process.env.API_HOST || '127.0.0.1')
}

main().catch(() => {
  console.error('API startup failed. Check environment and database connectivity.')
  process.exit(1)
})
