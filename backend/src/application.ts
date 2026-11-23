import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'node:crypto'
import { AppModule } from './app.module'
import { Database } from './database/database'
import { config, runtime } from './config/env'
import { Errors, log } from './common/errors'
import { describeApi } from './common/openapi'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

function isAllowedOrigin(req: Request) {
  const value = req.get('origin')
  if (!value) return false
  try {
    const origin = new URL(value)
    if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== value) return false
    const host = req.get('host')
    if (!host) return origin.origin === config.origin
    const requestOrigin = new URL(`${req.protocol}://${host}`).origin
    return origin.origin === config.origin || origin.origin === requestOrigin
  } catch {
    return false
  }
}

export async function createApplication() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] })
  app.useBodyParser('json', { limit: '1500kb' })
  app.useGlobalFilters(new Errors())
  app.use(compression())
  app.set('trust proxy', process.env.VERCEL ? 1 : runtime.TRUST_PROXY_HOPS)
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
    const publicEvents =
      req.method === 'GET' && /^\/api\/v1\/events(?:\/[a-z0-9-]+)?$/.test(req.path)
    res.setHeader(
      'Cache-Control',
      publicEvents ? 'public, s-maxage=5, stale-while-revalidate=10' : 'no-store',
    )
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !isAllowedOrigin(req))
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
  await app.init()
  return app
}
