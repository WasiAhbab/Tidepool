import { createTransport } from 'nodemailer'
import { required } from '../config/env'
export const transport = createTransport({
  host: required('SMTP_HOST'),
  port: Number(required('SMTP_PORT')),
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: process.env.NODE_ENV === 'production' && process.env.SMTP_SECURE !== 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: required('SMTP_PASSWORD') }
    : undefined,
  connectionTimeout: 8000,
  socketTimeout: 10000,
})
