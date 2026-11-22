import type { Database } from '../database/database'
import { config } from '../config/env'
import { transport } from './transport'

export async function deliverQueuedMail(db: Database, limit = 12) {
  let delivered = 0
  for (let i = 0; i < limit; i++) {
    const sent = await db.tx(async (c) => {
      const mail = (
        await c.query(
          'select * from mail_queue where failed_at is null and next_attempt<=now() order by id limit 1 for update skip locked',
        )
      ).rows[0]
      if (!mail) return false
      try {
        await transport.sendMail({
          from: config.from,
          to: mail.recipient,
          subject: mail.subject,
          text: mail.body,
          messageId: '<notice-' + mail.id + '@' + new URL(config.origin).hostname + '>',
        })
      } catch {
        await c.query(
          "update mail_queue set failed_at=case when attempts>=7 then now() end,attempts=attempts+1,next_attempt=now()+least(3600,30*(attempts+1))*interval '1 second' where id=$1",
          [mail.id],
        )
        return true
      }
      await c.query('delete from mail_queue where id=$1', [mail.id])
      return true
    })
    if (!sent) break
    delivered++
  }
  return delivered
}
