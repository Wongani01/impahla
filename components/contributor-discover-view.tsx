'use client'

import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, Search, Sparkles } from 'lucide-react'
import { EventCard } from '@/components/event-card'
import type { EventRecord } from '@/lib/event-store'

type ContributorDiscoverViewProps = {
  onOpen: (event: EventRecord) => void
}

export function ContributorDiscoverView({ onOpen }: ContributorDiscoverViewProps) {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (term: string) => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ open: '1' })
      if (term.trim()) params.set('q', term.trim())
      const response = await fetch(`/api/events?${params.toString()}`, { cache: 'no-store' })
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not load events.')
      setEvents((data.events ?? []) as EventRecord[])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load events.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => void load(query), 300)
    return () => window.clearTimeout(handle)
  }, [load, query])

  return (
    <section className="dashboard-page" aria-labelledby="discover-heading">
      <div className="page-heading-row">
        <div>
          <p className="section-kicker">
            CELEBRATIONS NEAR YOU
            <span className="kicker-sparkle">
              <Sparkles aria-hidden="true" />
            </span>
          </p>
          <h1 id="discover-heading">Discover events</h1>
          <p className="page-intro">Find a celebration and give toward it — every pledge is recorded in the registry.</p>
        </div>
      </div>

      <div className="list-controls discover-controls">
        <label className="search-box discover-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search events</span>
          <input
            value={query}
            onChange={(changeEvent) => setQuery(changeEvent.target.value)}
            placeholder="Search by event, host or venue"
          />
        </label>
      </div>

      {error && (
        <div className="storage-alert" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="list-empty">
          <span className="empty-icon">
            <LoaderCircle className="button-spinner" aria-hidden="true" />
          </span>
          <div>
            <strong>Loading events…</strong>
            <p>Finding celebrations that are open for contributions.</p>
          </div>
        </div>
      ) : events.length ? (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="list-empty">
          <span className="empty-icon">
            <Sparkles aria-hidden="true" />
          </span>
          <div>
            <strong>No events available right now.</strong>
            <p>Please check back soon — new celebrations appear here as planners list them.</p>
          </div>
        </div>
      )}
    </section>
  )
}
