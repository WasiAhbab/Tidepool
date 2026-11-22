import { Response } from 'express'
import { config } from '../config/env'
export function cookie(res: Response, key: string, value: string, maxAge: number) {
  res.cookie(key, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.origin.startsWith('https://'),
    path: '/',
    maxAge,
  })
}
