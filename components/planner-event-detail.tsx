'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CircleDollarSign, Gift, LoaderCircle, Lock, MapPin, PackageCheck, Pencil, Phone, UsersRound } from 'lucide-react'
import {
  CONTRIBUTION_STATUSES,
  contributionStatusLabel,
  formatContributionDate,
  formatKwacha,
  type Contribution,
  type ContributionStatus,
} from '@/lib/contribution-store'
import {
  categoryLabel,
  formatEventDate,
  formatEventTime,
  type EventRecord,
  type EventSummary,
} from '@/lib/event-store'

type PlannerEventDetailProps = {
  eventId: string
  onBack: () => void
  onEdit: (event: EventRecord) => void
  notify: (message: string) => void
}

export function PlannerEventDetail({ eventId, onBack, onEdit, notify }: PlannerEventDetailProps) {
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [summary, setSummary] = useState<EventSummary | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [isClosing, setIsClosing] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const detailResponse = await fetch(`/api/events/${eventId}`, { cache: 'no-store' })
      const detail = (await detailResponse.json().catch(() => ({}))) as Record<string, unknown>
      if (!detailResponse.ok) throw new Error(typeof detail.error === 'string' ? detail.error : 'Could not load this event.')
      setEvent(detail.event as EventRecord)
      setSummary(detail.summary as EventSummary)

      const listResponse = await fetch(`/api/events/${eventId}/contributions`, { cache: 'no-store' })
      const list = (await listResponse.json().catch(() => ({}))) as Record<string, unknown>
      if (listResponse.ok) setContributions((list.contributions ?? []) as Contribution[])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this event.')
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  const changeStatus = async (contribution: Contribution, status: ContributionStatus) => {
    setBusyId(contribution.id)
    try {
      const response = await fetch(`/api/contributions/${contribution.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contributionStatus: status }),
      })
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not update this contribution.')
      setContributions((current) =>
        current.map((item) => (item.id === contribution.id ? { ...item, contributionStatus: status } : item)),
      )
      const refreshed = await fetch(`/api/events/${eventId}`, { cache: 'no-store' })
      const detail = (await refreshed.json().catch(() => ({}))) as Record<string, unknown>
      if (refreshed.ok && detail.summary) setSummary(detail.summary as EventSummary)
      notify(`${contribution.contributorName}'s contribution marked ${contributionStatusLabel(status).toLowerCase()}.`)
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not update this contribution.')
    } finally {
      setBusyId('')
    }
  }

  const closeEvent = async () => {
    setIsClosing(true)
    try {
      const response = await fetch(`/api/events/${eventId}/close`, { method: 'POST' })
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not close this event.')
      setEvent(data.event as EventRecord)
      notify('Event closed. It is no longer listed for contributors.')
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Could not close this event.')
    } finally {
      setIsClosing(false)
    }
  }

  if (isLoading) {
    return (
      <section className="dashboard-page">
        <div className="list-empty">
          <span className="empty-icon">
            <LoaderCircle className="button-spinner" aria-hidden="true" />
          </span>
          <div>
            <strong>Loading event…</strong>
            <p>Fetching contributions and summary.</p>
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
            Back to events
          </button>
        </div>
        <div className="storage-alert" role="alert">
          {error || 'Event not found.'}
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-page" aria-labelledby="event-detail-heading">
      <div className="page-heading-row">
        <div>
          <p className="section-kicker">{categoryLabel(event.category).toUpperCase()}</p>
          <h1 id="event-detail-heading">{event.eventName}</h1>
          <p className="page-intro">
            Hosted by {event.hostName} · {formatEventDate(event.eventDate)} · {formatEventTime(event.eventTime)}
          </p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Back
          </button>
          <button className="secondary-button" type="button" onClick={() => onEdit(event)}>
            <Pencil aria-hidden="true" />
            Edit
          </button>
          {event.status !== 'closed' && (
            <button className="primary-button" type="button" onClick={closeEvent} disabled={isClosing}>
              {isClosing ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <Lock aria-hidden="true" />}
              {isClosing ? 'Closing…' : 'Close event'}
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid" aria-label="Event summary">
        <article className="stat-card stat-received">
          <div className="stat-card-top">
            <span className="stat-icon">
              <CircleDollarSign aria-hidden="true" />
            </span>
            <span className="stat-overline">CASH RECEIVED</span>
          </div>
          <strong className="stat-value">{formatKwacha(summary?.totalCash ?? 0)}</strong>
          <span className="stat-caption">Already in hand</span>
        </article>
        <article className="stat-card stat-promised">
          <div className="stat-card-top">
            <span className="stat-icon">
              <CircleDollarSign aria-hidden="true" />
            </span>
            <span className="stat-overline">OUTSTANDING CASH</span>
          </div>
          <strong className="stat-value">{formatKwacha(summary?.outstanding ?? 0)}</strong>
          <span className="stat-caption">Still pledged</span>
        </article>
        <article className="stat-card stat-contributors">
          <div className="stat-card-top">
            <span className="stat-icon">
              <UsersRound aria-hidden="true" />
            </span>
            <span className="stat-overline">CONTRIBUTORS</span>
          </div>
          <strong className="stat-value">{summary?.totalContributors ?? 0}</strong>
          <span className="stat-caption">Generous people</span>
        </article>
        <article className="stat-card stat-gifts">
          <div className="stat-card-top">
            <span className="stat-icon">
              <Gift aria-hidden="true" />
            </span>
            <span className="stat-overline">GIFTS</span>
          </div>
          <strong className="stat-value">
            {summary?.giftsReceived ?? 0}/{summary?.giftsPledged ?? 0}
          </strong>
          <span className="stat-caption">Received / pledged</span>
        </article>
      </div>

      <div className="list-panel" style={{ marginTop: 16 }}>
        <div className="panel-heading" style={{ padding: '16px 18px 12px' }}>
          <div>
            <p className="panel-eyebrow">GUEST CONTRIBUTIONS</p>
            <h2>Contribution records</h2>
          </div>
        </div>

        {contributions.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Contributor</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Amount / Gift</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((contribution) => (
                  <tr key={contribution.id}>
                    <td>
                      <span className="admin-user-cell">{contribution.contributorName}</span>
                    </td>
                    <td className="admin-muted">{contribution.phoneNumber || '—'}</td>
                    <td className="admin-muted">
                      {contribution.contributionType === 'gift' ? (
                        <>
                          <Gift aria-hidden="true" /> Gift
                        </>
                      ) : (
                        'Cash'
                      )}
                    </td>
                    <td className="admin-amount">
                      {contribution.contributionType === 'gift'
                        ? `${contribution.giftDescription || 'Physical gift'} ×${contribution.quantity}`
                        : formatKwacha(contribution.cashAmount)}
                    </td>
                    <td className="admin-muted">{formatContributionDate(contribution.date)}</td>
                    <td>
                      <select
                        className="form-select table-status-select"
                        value={contribution.contributionStatus}
                        disabled={busyId === contribution.id}
                        onChange={(changeEvent) => changeStatus(contribution, changeEvent.target.value as ContributionStatus)}
                        aria-label={`Status for ${contribution.contributorName}`}
                      >
                        {CONTRIBUTION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {contributionStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="list-empty">
            <span className="empty-icon">
              <PackageCheck aria-hidden="true" />
            </span>
            <div>
              <strong>No contributions yet.</strong>
              <p>Guest contributions will appear here as they are submitted.</p>
            </div>
          </div>
        )}
      </div>

      <div className="event-facts" style={{ marginTop: 16 }}>
        <article className="list-panel event-facts-card">
          <p className="panel-eyebrow">EVENT DETAILS</p>
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
        </article>
        <article className="list-panel event-facts-card">
          <p className="panel-eyebrow">ABOUT THIS EVENT</p>
          <p className="event-description">{event.description || 'No description added yet.'}</p>
        </article>
      </div>
    </section>
  )
}
