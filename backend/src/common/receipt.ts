import type { PoolClient } from 'pg'
import { ConflictException } from '@nestjs/common'
import { hash } from './validation'
export async function receipt(
  c: PoolClient,
  event: string,
  key: string | undefined,
  actor: string,
  kind: string,
) {
  if (!key) return null
  const row = (
    await c.query('select * from command_receipts where event_id=$1 and request_key=$2', [
      event,
      key,
    ])
  ).rows[0]
  if (!row) return null
  if (row.actor_key !== hash(actor) || row.kind !== kind)
    throw new ConflictException('This request key is already in use.')
  return row.result
}
export async function record(
  c: PoolClient,
  event: string,
  key: string | undefined,
  actor: string,
  kind: string,
  result: object,
) {
  if (key)
    await c.query('insert into command_receipts values($1,$2,$3,$4,$5)', [
      event,
      key,
      hash(actor),
      kind,
      JSON.stringify(result),
    ])
  return result
}
