import { useCallback, useEffect, useRef, useState } from 'react'
import type { InventoryRepository } from '../services/repository'
import type { HouseholdData, Membership } from '../types'

const EMPTY_DATA: HouseholdData = {
  categories: [],
  locations: [],
  products: [],
  movements: [],
  members: [],
  invites: [],
}

export function useHouseholdData(repository: InventoryRepository, membership: Membership) {
  const [data, setData] = useState<HouseholdData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const refresh = useCallback(async (silent = false) => {
    const currentRequest = ++requestId.current
    if (!silent) setLoading(true)
    try {
      const next = await repository.loadHouseholdData(membership)
      if (currentRequest !== requestId.current) return
      setData(next)
      setError('')
    } catch (caught) {
      if (currentRequest !== requestId.current) return
      setError(caught instanceof Error ? caught.message : 'No fue posible sincronizar el hogar.')
    } finally {
      if (currentRequest === requestId.current && !silent) setLoading(false)
    }
  }, [membership, repository])

  useEffect(() => {
    setData(EMPTY_DATA)
    void refresh(false)
  }, [refresh])

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(true), 45 * 60 * 1000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh(true)
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [refresh])

  useEffect(() => {
    let timer = 0
    const unsubscribe = repository.subscribe(membership, () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void refresh(true), 180)
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [membership, refresh, repository])

  return { data, loading, error, refresh }
}
