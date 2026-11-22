'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, reason } from '@/services/api-client'
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(''),
    revision = useRef(0)
  const reload = useCallback(async () => {
    const n = ++revision.current
    if (!path) {
      setData(null)
      return
    }
    try {
      const value = await api<T>(path)
      if (n === revision.current) {
        setData(value)
        setError('')
      }
    } catch (e) {
      if (n === revision.current) setError(reason(e))
    }
  }, [path])
  useEffect(() => {
    setData(null)
    setError('')
    void reload()
    return () => {
      revision.current++
    }
  }, [reload])
  return { data, error, reload }
}
