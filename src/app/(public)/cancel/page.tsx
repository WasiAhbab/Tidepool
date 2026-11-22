import { CancelRegistration } from '@/features/passes/cancel-registration'

export const metadata = {
  title: 'Release your place',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function CancelPage() {
  return <CancelRegistration />
}
