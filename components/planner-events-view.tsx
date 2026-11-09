'use client'

import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, Plus } from 'lucide-react'
import { EventCard } from '@/components/event-card'
import type { EventRecord } from '@/lib/event-store'

type PlannerEventsViewProps = {
  onCreate: () => void
  onOpen: (event: EventRecord) => void
}

export function PlannerEventsView({ onCreate, onOpen }: PlannerEventsViewProps) {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/events?mine=1', { cache: 'no-store' })
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not load your events.')
      setEvents((data.events ?? []) as EventRecord[])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your events.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="dashboard-page" aria-labelledby="my-events-heading">
      <div className="page-heading-row">
        <div>
          <p className="section-kicker">YOUR CELEBRATIONS</p>
          <h1 id="my-events-heading">My events</h1>
          <p className="page-intro">Open a celebration to track contributions, or create a new one.</p>
        </div>
        <button className="primary-button" type="button" onClick={onCreate}>
          <Plus aria-hidden="true" />
          Create event
        </button>
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
            <strong>Loading your events…</strong>
            <p>Fetching your celebrations from the registry.</p>
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
            <Plus aria-hidden="true" />
          </span>
          <div>
            <strong>No events yet — create your first event.</strong>
            <p>Your events will appear here once you list a celebration.</p>
          </div>
          <button className="secondary-button" type="button" onClick={onCreate}>
            Create event
          </button>
        </div>
      )}
    </section>
  )
}
