import test from 'node:test'
import assert from 'node:assert/strict'
import { account, clean, codeFor, guest, origin, payload, pool, request, tag } from './support.mjs'

test('Student admission and committee operations on real Supabase', async (t) => {
  t.after(clean)
  let staff, event
  const guests = []
  const post = (p, b, c) =>
    request(p, {
      method: 'POST',
      body: p.endsWith('/register') ? { consent: true, ...b } : b,
      cookie: c,
    })
  const patch = async (id, b) => {
    const revision = (await request('committee/events', { cookie: staff })).data.find(
      (e) => e.id === id,
    ).revision
    return request('committee/events/' + id, {
      method: 'PATCH',
      body: { revision, ...b },
      cookie: staff,
    })
  }
  await t.test(
    'public discovery excludes private data, guests cannot open rosters, foreign origin is rejected',
    async () => {
      const r = await request('events')
      assert.equal(r.status, 200)
      assert.ok(r.data.length)
      assert.equal(r.data[0].email, undefined)
      assert.equal((await request('committee/events')).status, 401)
      assert.equal((await request('committee/events/' + r.data[0].id + '/export')).status, 401)
      assert.equal((await request('events/not-an-id')).status, 404)
      assert.equal(
        (
          await request('auth/code', {
            method: 'POST',
            body: { email: 'invalid' },
            headers: { Origin: 'https://other.invalid' },
          })
        ).status,
        403,
      )
      assert.equal((await post('auth/code', { email: 'invalid' })).status, 400)
    },
  )
  await t.test(
    'Supabase committee login, draft visibility, event validation and publishing',
    async () => {
      assert.equal(
        (await post('auth/committee', { ...account, password: 'incorrect' })).status,
        401,
      )
      const login = await post('auth/committee', account)
      assert.equal(login.status, 200)
      staff = login.cookie
      assert.equal((await post('committee/events', payload({ capacity: 0 }), staff)).status, 400)
      event = (await post('committee/events', payload({ state: 'draft' }), staff)).data
      assert.ok(event.id)
      assert.equal((await request('events/' + event.id)).status, 404)
      const changed = await patch(event.id, payload())
      assert.equal(changed.status, 200)
      assert.equal((await request('events/' + event.id)).data.state, 'published')
      assert.equal((await patch(event.id, payload({ revision: event.revision }))).status, 409)
    },
  )
  await t.test(
    'email codes are one-use, expire, and lock after five incorrect attempts',
    async () => {
      const email = tag + '-otp@tidepool.test'
      const x = (await post('auth/code', { email })).data
      const correct = await codeFor(email),
        wrong = correct === '000000' ? '111111' : '000000'
      for (let i = 0; i < 5; i++)
        assert.equal((await post('auth/verify', { id: x.id, code: wrong })).status, 401)
      assert.equal((await post('auth/verify', { id: x.id, code: correct })).status, 401)
      const addr = tag + '-once@tidepool.test',
        ch = (await post('auth/code', { email: addr })).data
      const code = await codeFor(addr)
      assert.equal((await post('auth/verify', { id: ch.id, code })).status, 200)
      assert.equal((await post('auth/verify', { id: ch.id, code })).status, 401)
      const exp = tag + '-expired@tidepool.test',
        old = (await post('auth/code', { email: exp })).data
      await pool.query("update challenges set expires_at=now()-interval '1 minute' where id=$1", [
        old.id,
      ])
      assert.equal(
        (await post('auth/verify', { id: old.id, code: await codeFor(exp) })).status,
        401,
      )
    },
  )
  await t.test(
    'ten verified students concurrently request two seats, with idempotent duplicate registrations',
    async () => {
      for (let i = 0; i < 10; i++) guests.push(await guest(tag + '-' + i + '@tidepool.test'))
      const requests = guests.flatMap((c, i) =>
        [1, 2].map(() =>
          post('events/' + event.id + '/register', { name: 'Student ' + i, waitlist: true }, c),
        ),
      )
      const results = await Promise.all(requests)
      for (const r of results) assert.equal(r.status, 201)
      const rows = (await request('committee/events/' + event.id + '/roster', { cookie: staff }))
        .data
      assert.equal(rows.length, 10)
      assert.equal(rows.filter((r) => r.status === 'confirmed').length, 2)
      assert.equal(rows.filter((r) => r.status === 'waitlisted').length, 8)
      const outsider = await guest(tag + '-outsider@tidepool.test')
      assert.equal(
        (
          await post(
            'events/' + event.id + '/register',
            { name: 'No waitlist', waitlist: false },
            outsider,
          )
        ).status,
        409,
      )
      assert.equal((await request('committee/events', { cookie: guests[0] })).status, 401)
      assert.equal((await request('passes', { cookie: guests[0] })).data.passes.length, 1)
    },
  )
  await t.test(
    'cancellation, FIFO promotion, safe capacity edits, check-in and CSV export',
    async () => {
      const rows = (await request('committee/events/' + event.id + '/roster', { cookie: staff }))
        .data
      const first = rows.find((r) => r.status === 'confirmed'),
        waiting = rows.find((r) => r.status === 'waitlisted')
      const token = guests[Number(first.email.split('-').at(-1).split('@')[0])]
      assert.equal((await patch(event.id, payload({ capacity: 1 }))).status, 409)
      assert.equal(
        (
          await post(
            'committee/events/' + event.id + '/check-in',
            { registration: first.id, checked: true },
            staff,
          )
        ).status,
        201,
      )
      assert.equal((await post('events/' + event.id + '/cancel-pass', {}, token)).status, 409)
      await post(
        'committee/events/' + event.id + '/check-in',
        { registration: first.id, checked: false },
        staff,
      )
      assert.equal((await post('events/' + event.id + '/cancel-pass', {}, token)).status, 201)
      let roster = (await request('committee/events/' + event.id + '/roster', { cookie: staff }))
        .data
      assert.equal(roster.find((r) => r.id === waiting.id).status, 'confirmed')
      const mailboxSearch = new URL('/api/v1/search', process.env.LOCAL_MAILBOX)
      mailboxSearch.searchParams.set(
        'query',
        'to:' + waiting.email + ' subject:"A seat opened for ' + event.title + '"',
      )
      let notified = false
      for (let attempt = 0; attempt < 40 && !notified; attempt++) {
        const messages = (await (await fetch(mailboxSearch)).json()).messages
        notified = messages.some((m) => m.Subject === 'A seat opened for ' + event.title)
        if (!notified) await new Promise((resolve) => setTimeout(resolve, 300))
      }
      assert.ok(notified, 'The promoted guest receives an email via the transactional mail queue')

      assert.equal((await patch(event.id, payload({ capacity: 4 }))).status, 409)
      const latest = (await request('committee/events', { cookie: staff })).data.find(
        (e) => e.id === event.id,
      )
      assert.equal(
        (
          await request('committee/events/' + event.id + '/settings', {
            method: 'PUT',
            cookie: staff,
            body: {
              revision: latest.revision,
              room_limit: 4,
              override_reason: '',
              timezone: 'Asia/Dhaka',
              email_domain: '',
              opens_at: null,
              closes_at: null,
              plus_one: false,
              waitlist_enabled: true,
              cover: null,
            },
          })
        ).status,
        200,
      )
      assert.equal((await patch(event.id, payload({ capacity: 4 }))).status, 200)
      roster = (await request('committee/events/' + event.id + '/roster', { cookie: staff })).data
      assert.equal(roster.filter((r) => r.status === 'confirmed').length, 4)
      const csv = await request('committee/events/' + event.id + '/export', { cookie: staff })
      assert.equal(csv.status, 200)
      assert.match(csv.data, /Student/)
      assert.equal(csv.data.split('\r\n').length, 10)
      assert.equal((await patch(event.id, payload({ state: 'draft', capacity: 4 }))).status, 409)
    },
  )
  await t.test(
    '500 simultaneous requests to a 100-seat room confirm 100 and waitlist 400',
    async () => {
      const room = await post(
        'committee/events',
        payload({ title: 'QA ' + tag + ' capacity rehearsal', capacity: 100 }),
        staff,
      )
      assert.equal(room.status, 201)
      const cookies = []
      for (let offset = 0; offset < 500; offset += 10) {
        cookies.push(
          ...(await Promise.all(
            Array.from({ length: 10 }, (_, n) =>
              guest(tag + '-room-' + (offset + n) + '@tidepool.test'),
            ),
          )),
        )
      }
      const results = await Promise.all(
        cookies.map((cookie, i) =>
          post(
            'events/' + room.data.id + '/register',
            { name: 'Seat rehearsal ' + i, waitlist: true },
            cookie,
          ),
        ),
      )
      assert.ok(results.every((r) => r.status === 201))
      assert.equal(results.filter((r) => r.data.status === 'confirmed').length, 100)
      assert.equal(results.filter((r) => r.data.status === 'waitlisted').length, 400)
      const totals = (await request('events/' + room.data.id)).data
      assert.equal(totals.attending, 100)
      assert.equal(totals.waiting, 400)
      const ordered = await pool.query(
        'select status,email from registrations where event_id=$1 order by registered_at,id',
        [room.data.id],
      )
      assert.equal(new Set(ordered.rows.map((r) => r.email)).size, 500)
      assert.ok(ordered.rows.every((r, i) => r.status === (i < 100 ? 'confirmed' : 'waitlisted')))
    },
  )
  await t.test(
    'event cancellation closes registration, retains history, signed-out sessions are revoked',
    async () => {
      assert.equal(
        (await patch(event.id, payload({ state: 'cancelled', capacity: 4 }))).status,
        200,
      )
      assert.equal(
        (await request('events')).data.some((e) => e.id === event.id),
        false,
      )
      assert.equal((await request('events/' + event.id)).data.state, 'cancelled')
      assert.equal(
        (
          await post(
            'events/' + event.id + '/register',
            { name: 'Student', waitlist: true },
            guests[0],
          )
        ).status,
        409,
      )
      await post('auth/logout', { role: 'committee' }, staff)
      assert.equal((await request('committee/events', { cookie: staff })).status, 401)
      await post('auth/logout', { role: 'guest' }, guests[0])
      assert.equal((await request('passes', { cookie: guests[0] })).status, 401)
    },
  )
})
