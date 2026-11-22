import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import assert from 'node:assert/strict'
import { account, clean, codeFor, guest, pool, origin, tag } from './support.mjs'
import { readFile } from 'node:fs/promises'

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
})
const staff = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const student = await browser.newContext({
  viewport: { width: 390, height: 844 },
  permissions: ['clipboard-read', 'clipboard-write'],
  reducedMotion: 'reduce',
})
const admin = await staff.newPage(),
  page = await student.newPage()
const errors = []
for (const p of [page, admin]) {
  p.setDefaultTimeout(8000)
  p.on('pageerror', (e) => errors.push(e.message))
}
const title = 'QA ' + tag + ' campus workshop'
const email = tag + '-browser@tidepool.test'
const field = (p, name) => p.getByLabel(name, { exact: true })
const button = (p, name) => p.getByRole('button', { name, exact: true })
async function visible(locator) {
  await locator.waitFor({ state: 'visible' })
}
async function accessibility(p) {
  await p.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    )
  })
  const result = await new AxeBuilder({ page: p })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  assert.deepEqual(
    result.violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) })),
    [],
  )
}
async function download(p, action) {
  const [file] = await Promise.all([p.waitForEvent('download'), action()])
  return readFile(await file.path(), 'utf8')
}
try {
  await pool.query(
    'update committee set role=$1 where user_id=(select id from auth.users where email=$2)',
    ['admin', account.email],
  )
  await page.goto(origin)
  await visible(page.getByRole('heading', { name: 'Upcoming events', exact: false }))
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await accessibility(page)
  await page.getByRole('link', { name: 'Explore events', exact: true }).click()
  for (const [name, cat] of [
    ['Workshops', 'Workshop'],
    ['Talks', 'Talk'],
    ['Hackathons', 'Hackathon'],
    ['Socials', 'Social'],
  ]) {
    await button(page, name).click()
    assert.ok((await page.locator('.card-top .kind').allTextContents()).every((c) => c === cat))
  }
  await button(page, 'All events').click()
  await button(page, 'Save Midnight Build').click()
  await button(page, 'Filters').click()
  await field(page, 'Saved events').check()
  assert.equal(await page.locator('.event-card').count(), 1)
  await field(page, 'Available seats').check()
  await field(page, 'Sort').selectOption('name')
  await field(page, 'Saved events').uncheck()
  await button(page, 'Filters').click()
  await button(page, 'Search events').click()
  await field(page, 'Search by event or venue').fill('no-matching-event')
  await visible(page.getByRole('heading', { name: 'No matching events' }))
  await button(page, 'Clear filters').click()
  await button(page, 'Close search').click()
  await button(page, 'List view').click()
  await visible(page.locator('.cards.list'))
  await button(page, 'Grid view').click()
  await page.reload()
  await visible(button(page, 'Unsave Midnight Build'))
  await button(page, 'Unsave Midnight Build').click()
  console.log(
    'PASS mobile discovery, categories, search, filters, persistent saves and layout controls',
  )
  await admin.goto(origin + '/dashboard')
  await accessibility(admin)
  await field(admin, 'Email address').fill(account.email)
  await field(admin, 'Password').fill(account.password)
  await button(admin, 'Sign in').click()
  await button(admin, 'Create event').click()
  await field(admin, 'Event title').fill(title)
  await field(admin, 'Venue').fill('Studio QA')
  await field(admin, 'Capacity').fill('1')
  const day = new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10)
  await field(admin, 'Starts · Dhaka time').fill(day + 'T14:00')
  await field(admin, 'Ends · Dhaka time').fill(day + 'T16:00')
  await field(admin, 'About the event').fill(
    'An end-to-end admission rehearsal in the society studio.',
  )
  await button(admin, 'Preview invite').click()
  await visible(admin.getByRole('dialog').getByRole('heading', { name: title }))
  await button(admin, 'Back to editing').click()
  await button(admin, 'Save draft').click()
  const item = admin.locator('.admin-list article').filter({ hasText: title })
  await visible(item)
  await field(admin, 'Find an event').fill(title)
  await button(item, 'Edit').click()
  await field(admin, 'Visibility').selectOption('published')
  await button(admin, 'Save changes').click()
  await visible(item.getByText(/published/))
  await page.goto(origin)
  await page.locator('.event-card').filter({ hasText: title }).locator('a').click()
  await visible(page.getByRole('heading', { name: title }))
  const ics = await download(page, () => button(page, 'Add to calendar').click())
  assert.match(ics, /BEGIN:VEVENT/)
  assert.ok(ics.includes(title))
  await button(page, 'Share event').click()
  await button(page, 'Copy link').click()
  await visible(page.getByRole('dialog', { name: 'Share invitation' }).getByRole('status'))
  await page.keyboard.press('Escape')
  await button(page, 'Register for event').click()
  await page.keyboard.press('Escape')
  await page.getByRole('dialog', { name: 'Event registration' }).waitFor({ state: 'hidden' })
  await button(page, 'Register for event').click()
  await accessibility(page)
  await field(page, 'Email address').fill(email)
  await button(page, 'Send my code').click()
  await visible(field(page, 'Verification code'))
  await field(page, 'Verification code').fill(await codeFor(email))
  await button(page, 'Verify email').click()
  await field(page, 'Full name').fill('Browser Student')
  await page.locator('input[name=consent]').check()
  await button(page, 'Confirm registration').click()
  await visible(page.getByRole('heading', { name: 'You’re on the list.' }))
  await page.getByRole('link', { name: 'Open my passes' }).click()
  await page.waitForURL('**/passes')
  await visible(page.getByRole('heading', { name: title }))
  await page.reload()
  await visible(page.getByText('Browser Student', { exact: false }))
  await accessibility(page)
  console.log(
    'PASS committee draft and publication, mobile invite, sharing, calendar export, email verification and pass persistence',
  )
  await button(page, 'Show entry QR').click()
  await visible(page.getByAltText('Signed entry QR code'))
  await button(page, 'Save on this device').click()
  await visible(page.getByText('Saved on this device for offline entry.'))
  await button(page, 'Close dialog').click()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, {
    timeout: 10000,
  })
  await student.setOffline(true)
  await page.reload()
  await visible(page.getByRole('heading', { name: 'Offline passes' }))
  await visible(page.getByText(title, { exact: true }))
  await student.setOffline(false)
  await page.goto(origin + '/passes')
  const second = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  })
  const cookie = await guest(tag + '-queue@tidepool.test')
  await second.addCookies([{ name: 'tp_guest', value: cookie.split('=')[1], url: origin }])
  const waiting = await second.newPage()
  const event = (await pool.query('select slug from events where title=$1', [title])).rows[0]
  await waiting.goto(origin + '/events/' + event.slug)
  await button(waiting, 'Join the waitlist').click()
  await field(waiting, 'Full name').fill('Queue Student')
  await waiting.locator('input[name=consent]').check()
  await button(waiting, 'Join waitlist').click()
  await visible(waiting.getByRole('heading', { name: 'You’re on the waitlist.' }))
  await waiting.getByRole('link', { name: 'Open my passes' }).click()
  await visible(waiting.getByText('Waitlist place 1'))
  await button(item, 'Roster').click()
  await accessibility(admin)
  await field(admin, 'Search attendees').fill('Browser Student')
  await visible(admin.getByText(email, { exact: false }))
  await button(admin, 'Check in').click()
  await visible(button(admin, 'Undo check-in'))
  await page.reload()
  await visible(page.getByText('Checked in', { exact: true }))
  const csv = await download(admin, () => admin.getByRole('link', { name: 'CSV' }).click())
  assert.ok(csv.includes(email))
  await button(admin, 'Undo check-in').click()
  await visible(button(admin, 'Check in'))
  await button(admin, 'Close dialog').click()
  await page.reload()
  await button(page, 'Cancel registration').click()
  await button(page, 'Keep my place').click()
  await button(page, 'Cancel registration').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel registration' }).click()
  await visible(page.getByRole('heading', { name: 'Your first event is waiting.' }))
  await waiting.reload()
  await visible(button(waiting, 'Show entry QR'))
  const door = await staff.newPage()
  await door.setViewportSize({ width: 390, height: 844 })
  await door.goto(origin + '/dashboard/check-in')
  await field(door, 'Door event').selectOption({ label: title })
  await field(door, 'Find a guest').fill('Queue Student')
  await visible(door.getByText('Queue Student', { exact: true }))
  await button(door, 'Sound off').click()
  await visible(button(door, 'Sound on'))
  await staff.setOffline(true)
  await button(door, 'Check in').click()
  await visible(button(door, 'Sync 1 pending scans'))
  await staff.setOffline(false)
  await visible(button(door, 'Checked in'))
  await waiting.reload()
  await visible(waiting.getByText('Checked in', { exact: true }))
  await button(waiting, 'Show entry QR').click()
  await visible(waiting.getByAltText('Signed entry QR code'))
  const passImage = await waiting.getByAltText('Signed entry QR code').getAttribute('src')
  // Feed the real pass into the camera decoder without depending on a physical camera in CI.
  await door.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    const draw = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 640, 480)
      ctx.drawImage(img, 160, 80, 320, 320)
    }
    draw()
    Object.defineProperty(window, 'BarcodeDetector', { configurable: true, value: undefined })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        const stream = canvas.captureStream(10),
          timer = setInterval(draw, 100)
        stream
          .getVideoTracks()[0]
          .addEventListener('ended', () => clearInterval(timer), { once: true })
        return stream
      },
    })
  }, passImage)
  await button(door, 'Scan entry QR').click()
  await visible(door.getByText(/Queue Student already checked in at/))
  await button(door, 'Close camera').click()
  await door.close()
  await second.close()
  await button(page, 'Sign out').click()
  await visible(page.getByRole('heading', { name: 'Find your passes' }))
  await button(item, 'Cancel event').click()
  await button(admin, 'Confirm cancellation').click()
  await visible(admin.getByText('cancelled', { exact: false }).first())
  for (const section of [
    'events',
    'programme',
    'announcements',
    'analytics',
    'team',
    'settings',
    'check-in',
  ]) {
    await admin.goto(origin + '/dashboard/' + section)
    await visible(admin.locator('main h1').first())
    await admin.waitForLoadState('networkidle')
    await accessibility(admin)
    assert.equal(await admin.getByText('We could not finish that request.').count(), 0)
  }
  await button(admin, 'Sign out').click()
  await visible(button(admin, 'Sign in'))
  await page.goto(origin + '/society')
  await visible(page.getByRole('heading', { name: 'Meet on campus.' }))
  await accessibility(page)
  await page.goto(origin + '/not-a-page')
  await visible(page.getByRole('heading', { name: 'Page not found' }))
  assert.deepEqual(errors, [])
  console.log(
    'PASS private roster, CSV, check-in and undo, guest cancellation, archive, sign-out, about and missing pages',
  )
} catch (error) {
  console.error('Active route:', page.url(), 'Committee route:', admin.url())
  throw error
} finally {
  await browser.close()
  await clean()
}
