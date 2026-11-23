import { ToastStack } from '@/components/ui/toasts'
import { cookies } from 'next/headers'
import { MotionRoot } from '@/components/shared/movement'
import { RouteFocus } from '@/components/layout/route-focus'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
const display = localFont({
  src: [
    { path: '../assets/fonts/instrument.woff2', style: 'normal', weight: '400' },
    { path: '../assets/fonts/instrument-italic.woff2', style: 'italic', weight: '400' },
  ],
  variable: '--display-face',
  preload: false,
  display: 'swap',
})
const bodyFace = localFont({
  src: '../assets/fonts/dm-sans.woff2',
  weight: '100 1000',
  variable: '--body-face',
  preload: false,
  display: 'swap',
})
const mono = localFont({
  src: '../assets/fonts/space-mono.woff2',
  variable: '--mono-face',
  preload: false,
  display: 'swap',
})
import '@/styles/globals.css'
import { Navigation, Footer } from '@/components/layout/navigation'
import { siteOrigin } from '@/lib/site'
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  icons: { apple: '/identity/apple-touch-icon.png' },
  openGraph: { images: ['/identity/share-coast.jpg'] },
  title: { default: 'Tidepool — Campus events', template: '%s · Tidepool' },
  description:
    'Discover workshops, talks, hackathons and socials with the Computer Science Society.',
}
export default async function Layout({
  children,
  invite,
}: {
  children: React.ReactNode
  invite: React.ReactNode
}) {
  const savedTheme = (await cookies()).get('tp_theme')?.value
  const theme = savedTheme === 'light' ? 'light' : 'dark'
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme={theme}
      className={[display.variable, bodyFace.variable, mono.variable].join(' ')}
    >
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <MotionRoot>
          <Navigation initial={theme} />
          <RouteFocus />
          <main id="main">{children}</main>
          {invite}
          <ToastStack />
          <Footer />
        </MotionRoot>
      </body>
    </html>
  )
}
