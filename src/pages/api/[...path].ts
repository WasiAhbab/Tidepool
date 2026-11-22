import type { NextApiRequest, NextApiResponse } from 'next'
import type { Request, Response } from 'express'
import { createApplication } from '../../../backend/dist/application.js'

let application: ReturnType<typeof createApplication> | undefined

export const config = {
  api: { bodyParser: false },
  maxDuration: 120,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  application ??= createApplication()
  const app = await application
  const express = app.getHttpAdapter().getInstance()
  express(req as unknown as Request, res as unknown as Response)
}
