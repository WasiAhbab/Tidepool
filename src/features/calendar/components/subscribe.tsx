'use client'

import { useState } from 'react'
import { CalendarDays, Check, Copy, Download, Radio } from 'lucide-react'

export function CalendarSubscribe({ feedUrl, webcalUrl }: { feedUrl: string; webcalUrl: string }) {
  const [message, setMessage] = useState('')

  async function copyFeed() {
    try {
      await navigator.clipboard.writeText(feedUrl)
      setMessage('Calendar address copied.')
      window.setTimeout(() => setMessage(''), 2400)
    } catch {
      setMessage('Copy isn’t available here. Select the address above to copy it.')
    }
  }

  return (
    <div className="calendar-options">
      <a className="solid" href={webcalUrl}>
        <Radio size={17} />
        Subscribe in calendar app
      </a>
      <a className="outline" href={feedUrl} download="tidepool-semester.ics">
        <Download size={16} />
        Download calendar file
      </a>
      <div className="calendar-feed">
        <div>
          <CalendarDays size={17} />
          <span>
            <b>Keep a live copy</b>
            <small>Paste this address into your calendar’s subscription settings.</small>
          </span>
        </div>
        <code>{feedUrl}</code>
        <button className="text-btn" onClick={copyFeed}>
          {message === 'Calendar address copied.' ? <Check size={16} /> : <Copy size={16} />}
          {message === 'Calendar address copied.' ? 'Copied' : 'Copy feed address'}
        </button>
        <span role="status" aria-live="polite">
          {message}
        </span>
      </div>
    </div>
  )
}
