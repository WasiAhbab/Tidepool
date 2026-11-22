import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { canSeat, mailboxIdentity } from '../backend/dist/contracts/admission.js'
import { icalendar, icalendarFeed } from '../backend/dist/contracts/calendar.js'
import { csvCell } from '../backend/dist/contracts/csv.js'
import { admission, eventInput } from '../backend/dist/contracts/events.js'
import { signature } from '../backend/dist/common/validation.js'
import {
  ticket,
  readTicket,
  cancellation,
  readCancellation,
} from '../backend/dist/passes/signing.js'

test('room arithmetic counts accompanying guests and honours the waiting line', () => {
  assert.equal(canSeat(30, 29, 2, false), false)
  assert.equal(canSeat(30, 29, 1, false), true)
  assert.equal(canSeat(30, 27, 1, true), false)
})
test('email identity respects provider rules', () => {
  assert.equal(mailboxIdentity(' Person.Alpha+cs@GMAIL.com '), 'personalpha@gmail.com')
  assert.equal(mailboxIdentity('person+project@university.edu'), 'person+project@university.edu')
})
test('calendar text escapes controls and folds UTF-8 lines at 75 octets', () => {
  const data = icalendar(
    {
      id: 'calendar-test',
      title: '你好'.repeat(60),
      description: 'line\na,b;c',
      venue: 'Lab',
      starts_at: '2027-03-14T06:00:00Z',
      ends_at: '2027-03-14T08:00:00Z',
    },
    new Date('2026-11-21T01:00:00Z'),
  )
  assert.match(data, /DTSTART:20270314T060000Z/)
  assert.ok(data.includes('line\\na\\,b\\;c'))
  assert.ok(data.split('\r\n').every((line) => Buffer.byteLength(line) <= 75))
})
test('semester feed contains distinct, cacheable events in one valid calendar', () => {
  const events = [
      {
        id: 'event-one',
        title: 'Studio, together',
        starts_at: '2027-03-14T06:00:00Z',
        ends_at: '2027-03-14T08:00:00Z',
        description: 'Bring a laptop',
        venue: 'Lab 1',
      },
      {
        id: 'event-two',
        title: 'Build night',
        starts_at: '2027-03-21T06:00:00Z',
        ends_at: '2027-03-21T10:00:00Z',
        description: 'Doors open at six',
        venue: 'Hall',
      },
    ],
    data = icalendarFeed(events, new Date('2026-11-21T01:00:00Z'))
  assert.match(data, /X-WR-CALNAME:Computer Science Society Events/)
  assert.equal((data.match(/BEGIN:VEVENT/g) || []).length, 2)
  assert.match(data, /UID:event-one@tidepool/)
  assert.match(data, /UID:event-two@tidepool/)
  assert.ok(data.endsWith('END:VCALENDAR\r\n'))
})
test('CSV encodes quotes, commas, and formula prefixes as text', () => {
  assert.equal(csvCell('A, "B"'), '"A, ""B"""')
  assert.equal(csvCell(' =FORMULA()'), '"\' =FORMULA()"')
  assert.equal(csvCell(null), '""')
})
test('challenge HMAC commits to the challenge and code', () => {
  assert.notEqual(signature('a123456'), signature('b123456'))
  assert.equal(
    signature('a123456'),
    crypto.createHmac('sha256', process.env.OTP_SECRET).update('a123456').digest('hex'),
  )
})
test('QR is bound to its event and registration nonce', () => {
  const id = crypto.randomUUID(),
    event = crypto.randomUUID(),
    nonce = crypto.randomUUID(),
    qr = ticket(id, event, nonce)
  assert.deepEqual(readTicket(qr, event), { id, nonce })
  assert.throws(() => readTicket(qr, crypto.randomUUID()))
})
test('email cancellation links are signed, event-bound, and expire at event start', () => {
  const id = crypto.randomUUID(),
    event = crypto.randomUUID(),
    nonce = crypto.randomUUID(),
    starts = new Date(Date.now() + 60_000),
    token = cancellation(id, event, nonce, starts)
  assert.deepEqual(readCancellation(token), {
    id,
    event,
    nonce,
    expires: Math.floor(starts.getTime() / 1000),
  })
  assert.throws(() => readCancellation(token + 'x'))
  assert.throws(() => readCancellation(cancellation(id, event, nonce, new Date(Date.now() - 1))))
})
test('registration schema requires consent and rejects a filled honeypot', () => {
  const base = { name: 'Guest Test', waitlist: false, consent: true }
  assert.ok(admission.safeParse(base).success)
  assert.equal(admission.safeParse({ ...base, consent: false }).success, false)
  assert.equal(admission.safeParse({ ...base, website: 'example' }).success, false)
  assert.equal(eventInput.safeParse({ title: 'Incomplete' }).success, false)
})
