'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
export function Dialog({
  title,
  close,
  closeDuration = 0,
  className,
  children,
}: {
  title: string
  close: () => void
  closeDuration?: number
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const closing = useRef(false)
  const timer = useRef<number | null>(null)
  function dismiss() {
    if (closing.current) return
    closing.current = true
    const el = ref.current
    if (closeDuration > 0 && el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.dataset.closing = 'true'
      timer.current = window.setTimeout(() => {
        timer.current = null
        close()
      }, closeDuration)
      return
    }
    close()
  }
  useEffect(() => {
    const dialog = ref.current!
    const old = document.activeElement as HTMLElement
    dialog.showModal()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
      dialog.close()
      document.body.style.overflow = prev
      old?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={className}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.target === ref.current) dismiss()
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const b = ref.current.getBoundingClientRect()
          if (
            e.clientX < b.left ||
            e.clientX > b.right ||
            e.clientY < b.top ||
            e.clientY > b.bottom
          )
            dismiss()
        }
      }}
    >
      <button className="dialog-close square" aria-label="Close dialog" onClick={dismiss}>
        <X size={18} />
      </button>
      {children}
    </dialog>
  )
}
