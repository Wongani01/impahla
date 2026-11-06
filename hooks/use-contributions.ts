'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getContributionStats, type Contribution } from '@/lib/contribution-store'

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong.')
  return data
}

export function useContributions() {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [isReady, setIsReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const knownIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    try {
      const data = await readJson(await fetch('/api/contributions', { cache: 'no-store' }))
      const list = (data.contributions ?? []) as Contribution[]
      knownIds.current = new Set(list.map((item) => item.id))
      setContributions(list)
      setStorageError('')
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not load your registry.')
    } finally {
      setIsReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const upsert = useCallback(async (contribution: Contribution) => {
    const isExisting = knownIds.current.has(contribution.id)
    try {
      const data = await readJson(
        await fetch(isExisting ? `/api/contributions/${contribution.id}` : '/api/contributions', {
          method: isExisting ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contribution),
        }),
      )
      const saved = data.contribution as Contribution
      knownIds.current.add(saved.id)
      setContributions((current) =>
        [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => b.date.localeCompare(a.date)),
      )
      setStorageError('')
      return true
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not save this contribution.')
      return false
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await readJson(await fetch(`/api/contributions/${id}`, { method: 'DELETE' }))
      knownIds.current.delete(id)
      setContributions((current) => current.filter((item) => item.id !== id))
      setStorageError('')
      return true
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not remove this contribution.')
      return false
    }
  }, [])

  const stats = useMemo(() => getContributionStats(contributions), [contributions])

  return { contributions, isReady, storageError, stats, upsert, remove }
}
