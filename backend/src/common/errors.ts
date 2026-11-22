import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common'
import type { Response } from 'express'
import pino from 'pino'
export const log = pino({
  redact: ['email', 'password', 'token', 'code', 'req.headers.cookie', 'req.headers.authorization'],
})
@Catch()
export class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()
    const status = error instanceof HttpException ? error.getStatus() : 500
    const message =
      error instanceof HttpException ? error.message : 'We could not finish that request.'
    if (status >= 500)
      log.error(
        {
          requestId: res.locals.requestId,
          status,
          type: error instanceof Error ? error.name : 'Error',
        },
        'Request failed',
      )
    res.status(status).json({
      code:
        (
          {
            400: 'INVALID_INPUT',
            401: 'SIGN_IN_REQUIRED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            429: 'RATE_LIMIT',
          } as Record<number, string>
        )[status] || 'SERVICE_ERROR',
      message,
      details: [],
      requestId: res.locals.requestId,
    })
  }
}
