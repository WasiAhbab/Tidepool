'use client'
import { AnimatePresence, motion } from 'motion/react'
import { Check, X } from 'lucide-react'
import { create } from 'zustand'
type Notice = { id: string; text: string }
const useNotices = create<{
  items: Notice[]
  push: (n: Notice) => void
  remove: (id: string) => void
}>((set) => ({
  items: [],
  push: (n) => set((s) => ({ items: [...s.items.slice(-2), n] })),
  remove: (id) => set((s) => ({ items: s.items.filter((n) => n.id !== id) })),
}))
export function toast(text: string) {
  const id = crypto.randomUUID()
  useNotices.getState().push({ id, text })
  setTimeout(() => useNotices.getState().remove(id), 5000)
}
export function ToastStack() {
  const { items, remove } = useNotices()
  return (
    <div aria-live="polite" aria-relevant="additions" className="toast-stack">
      <AnimatePresence>
        {items.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="toast"
          >
            <Check size={17} />
            {n.text}
            <button aria-label="Dismiss notification" onClick={() => remove(n.id)}>
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
