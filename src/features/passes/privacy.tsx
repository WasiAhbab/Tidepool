'use client'
import { useState } from 'react'
import { api, reason } from '@/services/api-client'
import { Dialog } from '@/components/ui/dialog'
import { offlineKey } from './ticket'
export function Privacy({ done }: { done: () => void }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  return (
    <div className="privacy-tools">
      <a href="/api/v1/passes/data" download="tidepool-data.json">
        Download my data
      </a>
      <button className="text-btn" onClick={() => setOpen(true)}>
        Delete my data
      </button>
      {open && (
        <Dialog title="Delete my data" close={() => !busy && setOpen(false)}>
          <section className="form">
            <h2>Delete your event data?</h2>
            <p>
              Your future places will be released. Your contact details, saved student profile,
              answers and feedback will be removed from your records. Attendance totals stay with
              the society.
            </p>
            {error && <p role="alert">{error}</p>}
            <button
              className="solid"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await api('passes/erase', 'POST', { confirm: 'DELETE' })
                  localStorage.removeItem(offlineKey)
                  setOpen(false)
                  done()
                } catch (e) {
                  setError(reason(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Delete my data and release my places
            </button>
            <button className="outline" onClick={() => setOpen(false)}>
              Keep my passes
            </button>
          </section>
        </Dialog>
      )}
    </div>
  )
}
