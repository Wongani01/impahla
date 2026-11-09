'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CircleDollarSign, Gift, LoaderCircle, MapPin, Phone, UsersRound } from 'lucide-react'
import { categoryLabel, formatEventDate, formatEventTime, type EventRecord } from '@/lib/event-store'
import type { ContributionType } from '@/lib/contribution-store'

type ContributorEventDetailProps = {
  eventId: string
  onBack: () => void
  onContribute: (type: ContributionType) => void
}

export function ContributorEventDetail({ eventId, onBack, onContribute }: ContributorEventDetailProps) {
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/events/${eventId}`, { cache: 'no-store' })
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not load this event.')
      setEvent(data.event as EventRecord)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this event.')
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  if (isLoading) {
    return (
      <section className="dashboard-page">
        <div className="list-empty">
          <span className="empty-icon">
            <LoaderCircle className="button-spinner" aria-hidden="true" />
          </span>
          <div>
            <strong>Loading event…</strong>
            <p>Fetching the celebration details.</p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !event) {
    return (
      <section className="dashboard-page">
        <div className="page-heading-row">
          <div>
            <p className="section-kicker">EVENT</p>
            <h1>Event</h1>
          </div>
          <button className="secondary-button" type="button" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Back
          </button>
        </div>
        <div className="storage-alert" role="alert">
          {error || 'Event not found.'}
        </div>
      </section>
    )
  }

  const isOpen = event.status === 'open'

  return (
    <section className="dashboard-page" aria-labelledby="contributor-event-heading">
      <div className="page-heading-row">
        <div>
          <p className="section-kicker">{categoryLabel(event.category).toUpperCase()}</p>
          <h1 id="contributor-event-heading">{event.eventName}</h1>
          <p className="page-intro">Hosted by {event.hostName}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back to events
        </button>
      </div>

      <article className="detail-hero">
        <span
          className="detail-hero-cover"
          style={event.coverImage ? { backgroundImage: `url(${event.coverImage})` } : undefined}
        >
          {!event.coverImage && <span className="event-card-cover-fallback">{categoryLabel(event.category)}</span>}
        </span>
        <div className="detail-hero-body">
          <span className={`status-pill ${event.status}`}>{isOpen ? 'Open for contributions' : 'Closed'}</span>
          <p className="event-description">{event.description || 'No description added yet.'}</p>
          <div className="detail-facts">
            <p className="event-fact">
              <CalendarDays aria-hidden="true" />
              {formatEventDate(event.eventDate)} · {formatEventTime(event.eventTime)}
            </p>
            <p className="event-fact">
              <MapPin aria-hidden="true" />
              {event.venue} · {event.location}
            </p>
            <p className="event-fact">
              <Phone aria-hidden="true" />
              {event.contactInfo}
            </p>
            <p className="event-fact">
              <UsersRound aria-hidden="true" />
              {event.expectedAttendees} guests expected
            </p>
          </div>

          {isOpen ? (
            <div className="detail-actions">
              <button className="primary-button" type="button" onClick={() => onContribute('cash')}>
                <CircleDollarSign aria-hidden="true" />
                Contribute Cash
              </button>
              <button className="secondary-button" type="button" onClick={() => onContribute('gift')}>
                <Gift aria-hidden="true" />
                Contribute Physical Gift
              </button>
            </div>
          ) : (
            <div className="storage-alert" role="status">
              This event is no longer accepting contributions.
            </div>
          )}
        </div>
      </article>
    </section>
  )
}
