import 'reflect-metadata'
import { describeApi } from './common/openapi'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import type { Request, Response, NextFunction } from 'express'
import { AppModule } from './app.module'
import { Database } from './database/database'
import { config, runtime } from './config/env'
import { transport } from './mail/transport'
import { maintain } from './mail/jobs'
import { Errors, log } from './common/errors'
import { randomUUID } from 'node:crypto'
import compression from 'compression'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import type { NestExpressApplication } from '@nestjs/platform-express'
async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] })
  app.useBodyParser('json', { limit: '1500kb' })
  app.useGlobalFilters(new Errors())
  app.use(compression())
  if (runtime.TRUST_PROXY_HOPS) app.set('trust proxy', runtime.TRUST_PROXY_HOPS)
  app.enableShutdownHooks()
  app.use(helmet(), cookieParser())
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.requestId = randomUUID()
    res.setHeader('X-Request-Id', res.locals.requestId)
    const start = Date.now()
    res.on('finish', () =>
      log.info(
        {
          requestId: res.locals.requestId,
          method: req.method,
          status: res.statusCode,
          ms: Date.now() - start,
        },
        'Request',
      ),
    )
    res.setHeader(
      'Cache-Control',
      req.method === 'GET' && /^\/api\/v1\/events(?:\/[a-z0-9-]+)?$/.test(req.path)
        ? 'public,max-age=0,must-revalidate'
        : 'no-store',
    )
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== config.origin)
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Request origin is not allowed.',
        details: [],
        requestId: res.locals.requestId,
      })
    next()
  })
  const db = app.get(Database)
  await db.pool.query('select 1 from events limit 1')
  let sending = false
  setInterval(async () => {
    if (sending) return
    sending = true
    try {
      for (let i = 0; i < 12; i++) {
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
      }
    } catch {
      console.error('Mail queue temporarily unavailable.')
    } finally {
      sending = false
    }
  }, 3000).unref()
  const jobs = () => maintain(db).catch(() => log.error('Scheduled maintenance deferred'))
  await jobs()
  setInterval(jobs, 60000).unref()
  if (process.env.NODE_ENV !== 'production') {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Tidepool API')
        .setVersion('1')
        .addCookieAuth('tp_guest', undefined, 'guest')
        .addCookieAuth('tp_committee', undefined, 'committee')
        .build(),
    )
    SwaggerModule.setup('api/docs', app, describeApi(doc))
  }
  await app.listen(Number(process.env.API_PORT || 4107), process.env.API_HOST || '127.0.0.1')
}
main().catch(() => {
  console.error('API startup failed. Check environment and database connectivity.')
  process.exit(1)
})
