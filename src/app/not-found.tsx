import Link from 'next/link'
export default function Missing() {
  return (
    <section className="empty">
      <h1>Page not found</h1>
      <p>This link may have changed or the event may still be a draft.</p>
      <Link className="solid" href="/">
        Discover events
      </Link>
    </section>
  )
}
