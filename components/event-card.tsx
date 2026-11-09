import { CalendarDays, MapPin, UsersRound } from 'lucide-react'
import { categoryLabel, formatEventDate, EVENT_STATUS_LABELS, type EventRecord } from '@/lib/event-store'

type EventCardProps = {
  event: EventRecord
  onOpen: (event: EventRecord) => void
}

export function EventCard({ event, onOpen }: EventCardProps) {
  return (
    <button className="event-card" type="button" onClick={() => onOpen(event)}>
      <span
        className="event-card-cover"
        style={event.coverImage ? { backgroundImage: `url(${event.coverImage})` } : undefined}
      >
        {!event.coverImage && <span className="event-card-cover-fallback">{categoryLabel(event.category)}</span>}
        <span className={`status-pill ${event.status}`}>{EVENT_STATUS_LABELS[event.status]}</span>
      </span>
      <span className="event-card-body">
        <span className="event-category-tag">{categoryLabel(event.category)}</span>
        <strong className="event-card-title">{event.eventName}</strong>
        <span className="event-card-host">Hosted by {event.hostName}</span>
        <span className="event-card-meta">
          <CalendarDays aria-hidden="true" />
          {formatEventDate(event.eventDate)}
        </span>
        <span className="event-card-meta">
          <MapPin aria-hidden="true" />
          {event.venue} · {event.location}
        </span>
        <span className="event-card-meta">
          <UsersRound aria-hidden="true" />
          {event.expectedAttendees} guests expected
        </span>
      </span>
    </button>
  )
}
