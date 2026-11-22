'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  CalendarDays,
  ClipboardList,
  ScanLine,
  Send,
  ChartNoAxesCombined,
  Users,
  Settings,
  LockKeyhole,
  LogOut,
} from 'lucide-react'
import { api, ApiError, reason } from '@/services/api-client'
import { Staff, useStaff } from '@/store/auth-store'
const links = [
  ['Events', '/dashboard', CalendarDays],
  ['Programme', '/dashboard/programme', ClipboardList],
  ['Check-in', '/dashboard/check-in', ScanLine],
  ['Announcements', '/dashboard/announcements', Send],
  ['Analytics', '/dashboard/analytics', ChartNoAxesCombined],
  ['Team', '/dashboard/team', Users],
  ['Settings', '/dashboard/settings', Settings],
] as const
export function Workspace({ children }: { children: React.ReactNode }) {
  const { staff, setStaff } = useStaff(),
    path = usePathname(),
    router = useRouter(),
    [loaded, ready] = useState(false),
    [message, setMessage] = useState(''),
    {
      register,
      handleSubmit,
      reset,
      formState: { isSubmitting },
    } = useForm<{ email: string; password: string }>()
  useEffect(() => {
    let live = true
    api<{ staff: Staff | null }>('auth/session')
      .then(({ staff: s }) => {
        if (live) setStaff(s)
      })
      .catch((e) => {
        if (live) {
          setStaff(null)
          if (!(e instanceof ApiError && e.status === 401)) setMessage(reason(e))
        }
      })
      .finally(() => {
        if (live) ready(true)
      })
    return () => {
      live = false
    }
  }, [setStaff])
  useEffect(() => {
    if (staff?.role === 'volunteer' && path !== '/dashboard/check-in')
      router.replace('/dashboard/check-in')
  }, [path, router, staff])
  useEffect(() => {
    if (!staff) return
    const urls = links
      .filter(([, url]) =>
        staff.role === 'volunteer'
          ? url.endsWith('check-in')
          : staff.role === 'organizer'
            ? !url.endsWith('/settings') && !url.endsWith('/team')
            : true,
      )
      .map(([, url]) => url)
    const warm = () => urls.forEach((url) => router.prefetch(url))
    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idle = idleWindow.requestIdleCallback.call(window, warm, { timeout: 1200 })
      return () => idleWindow.cancelIdleCallback?.call(window, idle)
    }
    const timer = window.setTimeout(warm, 250)
    return () => window.clearTimeout(timer)
  }, [router, staff])
  if (!loaded)
    return (
      <div className="container skeletons" role="status" aria-label="Loading workspace">
        <div />
      </div>
    )
  if (!staff)
    return (
      <div className="container subpage">
        <div className="page-title">
          <div>
            <p className="eyebrow rust">Computer Science Society</p>
            <h1>Committee workspace</h1>
          </div>
        </div>
        <div className="auth-card">
          <form
            className="form"
            onSubmit={handleSubmit(async (v) => {
              setMessage('')
              try {
                await api('auth/committee', 'POST', v)
                reset()
                setStaff(await api<Staff>('auth/staff'))
              } catch (e) {
                setMessage(reason(e))
              }
            })}
          >
            <span className="form-icon">
              <LockKeyhole />
            </span>
            <h2>Committee sign-in</h2>
            <label>
              Email address
              <input required type="email" autoComplete="username" {...register('email')} />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
            </label>
            {message && (
              <p className="alert" role="alert">
                {message}
              </p>
            )}
            <button className="solid" disabled={isSubmitting}>
              Sign in
            </button>
          </form>
        </div>
      </div>
    )
  const allowed = links.filter(([, url]) =>
    staff.role === 'volunteer'
      ? url.endsWith('check-in')
      : staff.role === 'organizer'
        ? !url.endsWith('/settings') && !url.endsWith('/team')
        : true,
  )
  return (
    <div className="container workspace">
      <aside>
        <p className="eyebrow rust">Committee</p>
        <nav aria-label="Workspace navigation">
          {allowed.map(([label, url, Icon]) => (
            <Link
              aria-current={path === url ? 'page' : undefined}
              key={url}
              href={url}
              prefetch
              scroll={false}
              onMouseEnter={() => router.prefetch(url)}
              onFocus={() => router.prefetch(url)}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="staff-account">
          <small>{staff.email}</small>
          <span>{staff.role}</span>
          <button
            className="text-btn"
            onClick={async () => {
              try {
                await api('auth/logout', 'POST', { role: 'committee' })
                localStorage.removeItem('tp.door.' + staff.committee_id)
                setStaff(null)
              } catch (e) {
                setMessage(reason(e))
              }
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="workspace-body">
        {message && <p role="alert">{message}</p>}
        {allowed.some(([, url]) => path === url) ||
        (path === '/dashboard/events' && staff.role !== 'volunteer') ? (
          children
        ) : (
          <section className="empty">
            <h1>Access restricted</h1>
            <p>Your committee role can use the sections in the navigation.</p>
          </section>
        )}
      </div>
    </div>
  )
}
