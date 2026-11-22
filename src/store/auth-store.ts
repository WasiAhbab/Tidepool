'use client'
import { create } from 'zustand'
export type Staff = {
  role: 'admin' | 'organizer' | 'volunteer'
  email: string
  committee_id: string
}
export const useStaff = create<{ staff: Staff | null; setStaff: (staff: Staff | null) => void }>(
  (set) => ({ staff: null, setStaff: (staff) => set({ staff }) }),
)
