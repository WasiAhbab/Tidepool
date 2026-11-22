import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import Excel from 'exceljs'
import { account, clean, guest, origin, payload, pool, request, tag } from './support.mjs'

test('Committee permissions, programme, guest privacy and the check-in desk', async (t) => {
  t.after(clean)
  const staff = (await request('auth/committee', { method: 'POST', body: account })).cookie
  const student = await guest(tag + '-programme@tidepool.test')
  const role = async (value) =>
    pool.query(
      'update committee set role=$1 where user_id=(select id from auth.users where email=$2)',
      [value, account.email],
    )
  const call = async (path, method, cookie, body, status) => {
    const r = await request(path, { method, cookie, body })
    assert.equal(r.status, status, method + ' ' + path + ' ' + JSON.stringify(r.data).slice(0, 300))
    return r.data
  }
  assert.deepEqual(await call('auth/session', 'GET', undefined, undefined, 200), {
    guest: false,
    staff: null,
  })
  assert.equal((await call('auth/session', 'GET', student, undefined, 200)).guest, true)
  const event = await call('committee/events', 'POST', staff, payload(), 201)
  const path = 'committee/events/' + event.id,
    publicPath = 'events/' + event.id
  const prog = () => call(path + '/programme', 'GET', staff, undefined, 200)
  const seat = {
    name: 'River Student',
    consent: true,
    listed: true,
    companion: true,
    waitlist: true,
    request_key: randomUUID(),
  }
  const manage = [
    ['GET', 'committee/events'],
    ['POST', 'committee/events'],
    ['PATCH', path],
    ['GET', path + '/programme'],
    ['PUT', path + '/programme'],
    ['PUT', path + '/settings'],
    ['POST', path + '/archive'],
    ['POST', path + '/duplicate'],
    ['POST', 'committee/covers'],
    ['GET', path + '/roster'],
    ['GET', path + '/export'],
    ['POST', path + '/bulk'],
    ['GET', path + '/announcements'],
    ['POST', path + '/announcements'],
    ['GET', 'committee/analytics'],
  ]
  const privileged = [
    ['GET', 'committee/team'],
    ['POST', 'committee/team'],
    ['PATCH', 'committee/team/' + randomUUID()],
    ['GET', 'committee/audit'],
    ['GET', 'committee/mail'],
    ['POST', 'committee/mail/retry'],
  ]
  const door = [
    ['GET', 'check-in/events'],
    ['GET', 'check-in/' + event.id],
    ['POST', path + '/check-in'],
  ]
  let question, pass, qr
  await t.test('Anonymous, guest, door volunteer and organizer permissions', async () => {
    for (const [method, route] of [...manage, ...privileged, ...door]) {
      await call(route, method, undefined, undefined, 401)
      await call(route, method, student, undefined, 401)
    }
    for (const [method, route] of privileged) await call(route, method, staff, undefined, 403)
    await role('volunteer')
    for (const [method, route] of [...manage, ...privileged])
      await call(route, method, staff, undefined, 403)
    await call('check-in/events', 'GET', staff, undefined, 200)
    const lookup = await call('check-in/' + event.id, 'GET', staff, undefined, 200)
    assert.equal(lookup.total, 0)
    await role('organizer')
  })
  await t.test(
    'Room, domain and time window rules; programme overlap and optimistic edits',
    async () => {
      const settings = {
        revision: event.revision,
        room_limit: 1,
        override_reason: '',
        timezone: 'Asia/Dhaka',
        email_domain: 'other.edu',
        opens_at: null,
        closes_at: null,
        plus_one: true,
        waitlist_enabled: true,
        cover: null,
      }
      await call(path + '/settings', 'PUT', staff, settings, 400)
      settings.room_limit = 2
      await call(path + '/settings', 'PUT', staff, settings, 200)
      await call(publicPath + '/register', 'POST', student, seat, 400)
      settings.revision++
      settings.email_domain = 'tidepool.test'
      settings.opens_at = new Date(Date.now() + 3600000).toISOString()
      await call(path + '/settings', 'PUT', staff, settings, 200)
      await call(publicPath + '/register', 'POST', student, seat, 409)
      settings.revision++
      settings.opens_at = null
      await call(path + '/settings', 'PUT', staff, settings, 200)
      const session = {
        title: 'Studio hour',
        room: 'Studio',
        track: 'Systems',
        speaker: 'River',
        starts_at: event.starts_at,
        ends_at: event.ends_at,
      }
      const programme = {
        revision: (await prog()).revision,
        tags: ['Systems'],
        speakers: [{ name: 'River', bio: 'Lab tutor', avatar: 1 }],
        questions: [{ label: 'Year', required: true, options: ['First', 'Second'] }],
        sessions: [session, session],
        resources: [{ label: 'Library', url: 'https://example.edu/library' }],
      }
      await call(path + '/programme', 'PUT', staff, programme, 400)
      programme.sessions.pop()
      await call(path + '/programme', 'PUT', staff, programme, 200)
      await call(path + '/programme', 'PUT', staff, programme, 409)
      const published = await call('events/' + event.slug, 'GET', undefined, undefined, 200)
      assert.equal(published.tags[0], 'Systems')
      assert.equal(published.agenda.length, 1)
      assert.equal(published.override_reason, undefined)
      question = published.questions[0].id
      await call(publicPath + '/register', 'POST', student, seat, 400)
      const registration = { ...seat, answers: { [question]: 'Second' } }
      pass = await call(publicPath + '/register', 'POST', student, registration, 201)
      assert.equal(
        pass.id,
        (await call(publicPath + '/register', 'POST', student, registration, 201)).id,
      )
      assert.equal((await call(publicPath, 'GET', undefined, undefined, 200)).attending, 2)
      assert.equal(
        (await call('passes/data', 'GET', student, undefined, 200)).registrations[0].answers.Year,
        'Second',
      )
      qr = (await call('passes', 'GET', student, undefined, 200)).passes[0].qr
    },
  )
  await t.test(
    'Spreadsheet, announcement receipts, bulk resend, event cloning and image decoding',
    async () => {
      const response = await fetch(origin + '/api/v1/' + path + '/export?format=xlsx', {
        headers: { cookie: staff },
      })
      assert.equal(response.status, 200)
      const book = new Excel.Workbook()
      await book.xlsx.load(await response.arrayBuffer())
      assert.ok(book.worksheets[0].getRow(2).values.includes('Second'))
      const note = {
        subject: 'Room opens early',
        body: 'Doors open ten minutes early.',
        audience: 'confirmed',
        request_key: randomUUID(),
      }
      assert.equal((await call(path + '/announcements', 'POST', staff, note, 201)).count, 1)
      assert.equal((await call(path + '/announcements', 'POST', staff, note, 201)).already, true)
      assert.equal((await call(path + '/announcements', 'GET', staff, undefined, 200)).length, 1)
      const action = { action: 'resend', ids: [pass.id], request_key: randomUUID() }
      assert.deepEqual(
        await call(path + '/bulk', 'POST', staff, action, 201),
        await call(path + '/bulk', 'POST', staff, action, 201),
      )
      const copy = await call(path + '/duplicate', 'POST', staff, undefined, 201)
      assert.equal(
        (await call('committee/events/' + copy.id + '/programme', 'GET', staff, undefined, 200))
          .questions.length,
        1,
      )
      await call(
        'committee/covers',
        'POST',
        staff,
        { data: Buffer.from('invalid cover file').toString('base64') },
        400,
      )
      const upload = await call(
        'committee/covers',
        'POST',
        staff,
        { data: (await readFile('public/identity/icon-192.png')).toString('base64') },
        201,
      )
      try {
        assert.equal((await fetch(origin + upload.url)).headers.get('content-type'), 'image/webp')
      } finally {
        await pool.query('delete from covers where id=$1', [upload.url.split('/').pop()])
      }
      await call('committee/events/' + copy.id + '/check-in', 'POST', staff, { ticket: qr }, 400)
    },
  )
  await t.test(
    'Revocation, replay, duplicate scan, reminder ledger, attended feedback, archive and erasure',
    async () => {
      await call(publicPath + '/cancel-pass', 'POST', student, undefined, 201)
      await call(
        publicPath + '/register',
        'POST',
        student,
        { ...seat, answers: { [question]: 'Second' } },
        409,
      )
      await call(path + '/check-in', 'POST', staff, { ticket: qr }, 404)
      await call(
        publicPath + '/register',
        'POST',
        student,
        { ...seat, answers: { [question]: 'First' }, request_key: randomUUID() },
        201,
      )
      await call(path + '/check-in', 'POST', staff, { ticket: qr }, 404)
      qr = (await call('passes', 'GET', student, undefined, 200)).passes[0].qr
      await role('volunteer')
      let checked = await call(path + '/check-in', 'POST', staff, { ticket: qr }, 201)
      assert.equal(checked.already, false)
      checked = await call(path + '/check-in', 'POST', staff, { ticket: qr }, 201)
      assert.equal(checked.already, true)
      assert.equal(
        (await call('check-in/' + event.id + '?q=River', 'GET', staff, undefined, 200)).checked,
        2,
      )
      await call(publicPath + '/cancel-pass', 'POST', student, undefined, 409)
      const review = { rating: 5, comment: 'Would come back.' }
      await call('passes/' + pass.id + '/feedback', 'POST', student, review, 403)
      const { Database } = await import('../backend/dist/database/database.js')
      const { maintain } = await import('../backend/dist/mail/jobs.js')
      const db = new Database()
      try {
        await pool.query(
          "update events set starts_at=now()+interval '90 minutes',ends_at=now()+interval '3 hours' where id=$1",
          [event.id],
        )
        await Promise.all([maintain(db), maintain(db)])
        await maintain(db)
        assert.equal(
          (await pool.query('select hours from reminders_sent where registration_id=$1', [pass.id]))
            .rows.length,
          0,
          'already checked-in guests do not receive reminders',
        )
      } finally {
        await db.onModuleDestroy()
      }
      await role('organizer')
      await pool.query(
        "update events set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' where id=$1",
        [event.id],
      )
      await call('passes/' + pass.id + '/feedback', 'POST', student, review, 201)
      await call(path + '/archive', 'POST', staff, { revision: (await prog()).revision }, 201)
      assert.ok(
        (await call('events?scope=archive', 'GET', undefined, undefined, 200)).some(
          (e) => e.id === event.id,
        ),
      )
      assert.ok(
        (await call('committee/analytics', 'GET', staff, undefined, 200)).events.some(
          (e) => e.id === event.id,
        ),
      )
      const report = await call('committee/analytics', 'GET', staff, undefined, 200)
      assert.ok(Array.isArray(report.feedback))
      assert.ok(!report.feedback.some((row) => row.id === event.id))
      await call('passes/erase', 'POST', student, { confirm: 'DELETE' }, 201)
      await call('passes', 'GET', student, undefined, 401)
      assert.equal(
        (await pool.query('select name from registrations where id=$1', [pass.id])).rows[0].name,
        'Deleted attendee',
      )
    },
  )
  await t.test('Live calendar feed and secure reminder cancellation links', async () => {
    const response = await fetch(origin + '/api/v1/calendar/semester.ics')
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/calendar/i)
    const initialCalendar = await response.text()
    assert.match(initialCalendar, /BEGIN:VCALENDAR/)
    assert.match(initialCalendar, /END:VCALENDAR/)

    const upcoming = await call(
        'committee/events',
        'POST',
        staff,
        payload({ title: 'QA ' + tag + ' reminder flow', capacity: 1 }),
        201,
      ),
      primary = await guest(tag + '-reminder@tidepool.test'),
      waiting = await guest(tag + '-waiting@tidepool.test'),
      registration = (emailName) => ({
        name: emailName,
        consent: true,
        listed: true,
        companion: false,
        waitlist: true,
        request_key: randomUUID(),
      }),
      confirmed = await call(
        'events/' + upcoming.id + '/register',
        'POST',
        primary,
        registration('Reminder attendee'),
        201,
      ),
      queued = await call(
        'events/' + upcoming.id + '/register',
        'POST',
        waiting,
        registration('Waiting attendee'),
        201,
      )
    assert.equal(queued.status, 'waitlisted')
    await pool.query(
      "update events set starts_at=now()+interval '90 minutes',ends_at=now()+interval '3 hours' where id=$1",
      [upcoming.id],
    )

    const { Database } = await import('../backend/dist/database/database.js'),
      { maintain } = await import('../backend/dist/mail/jobs.js'),
      db = new Database()
    try {
      await Promise.all([maintain(db), maintain(db)])
      await maintain(db)
    } finally {
      await db.onModuleDestroy()
    }
    const ledger = await pool.query('select hours from reminders_sent where registration_id=$1', [
        confirmed.id,
      ]),
      email = await pool.query(
        'select body from mail_queue where recipient=$1 and subject like $2 order by id desc limit 1',
        [tag + '-reminder@tidepool.test', '%starts in about 2 hours%'],
      )
    assert.deepEqual(
      ledger.rows.map((row) => row.hours),
      [2],
    )
    const token = email.rows[0]?.body.match(/\/cancel#([A-Za-z0-9.-]+)/)?.[1]
    assert.ok(token, 'reminder includes a signed cancellation link')
    const preview = await call('passes/cancel-link/preview', 'POST', undefined, { token }, 201)
    assert.equal(preview.title, upcoming.title)
    const feed = await (await fetch(origin + '/api/v1/calendar/semester.ics')).text()
    assert.ok(feed.includes('UID:' + upcoming.id + '@tidepool'))

    await call('passes/cancel-link', 'POST', undefined, { token }, 201)
    const statuses = await pool.query(
      'select id,status from registrations where id=any($1::uuid[]) order by id',
      [[confirmed.id, queued.id]],
    )
    assert.equal(statuses.rows.find((row) => row.id === confirmed.id).status, 'cancelled')
    assert.equal(statuses.rows.find((row) => row.id === queued.id).status, 'confirmed')
    await call('passes/cancel-link', 'POST', undefined, { token }, 409)
  })
  await t.test('Administrator membership, mail queue and audit history', async () => {
    await role('admin')
    const member = (await call('auth/staff', 'GET', staff, undefined, 200)).committee_id
    assert.ok(
      (await call('committee/team', 'GET', staff, undefined, 200)).some(
        (x) => x.user_id === member,
      ),
    )
    await call(
      'committee/team',
      'POST',
      staff,
      { email: tag + '-absent@tidepool.test', role: 'volunteer' },
      409,
    )
    await call('committee/team/' + member, 'PATCH', staff, { role: 'volunteer' }, 409)
    assert.ok(
      (await call('committee/audit', 'GET', staff, undefined, 200)).some(
        (x) => x.event_id === event.id,
      ),
    )
    assert.ok(
      Number.isInteger((await call('committee/mail', 'GET', staff, undefined, 200)).pending),
    )
    assert.ok(
      Number.isInteger((await call('committee/mail/retry', 'POST', staff, undefined, 201)).count),
    )
  })
})
