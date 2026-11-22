'use client'
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty">
      <h1>Connection interrupted</h1>
      <p>We couldn’t load this page. Please try again.</p>
      <button className="solid" onClick={reset}>
        Try again
      </button>
    </section>
  )
}
