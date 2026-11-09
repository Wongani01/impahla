export type EventCategory = 'kitchen_party' | 'bridal_shower' | 'other'
export type EventStatus = 'open' | 'closed' | 'cancelled'

export type EventRecord = {
  id: string
  plannerId: string
  eventName: string
  description: string
  category: EventCategory
  hostName: string
  eventDate: string
  eventTime: string
  venue: string
  location: string
  contactInfo: string
  expectedAttendees: number
  coverImage: string | null
  status: EventStatus
  createdAt?: string
  updatedAt?: string
}

export type EventSummary = {
  totalContributors: number
  totalCash: number
  giftsPledged: number
  giftsReceived: number
  outstanding: number
}

export const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'kitchen_party', label: 'Kitchen Party' },
  { value: 'bridal_shower', label: 'Bridal Shower' },
  { value: 'other', label: 'Other Celebration' },
]

export const EVENT_STATUSES: EventStatus[] = ['open', 'closed', 'cancelled']

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  kitchen_party: 'Kitchen Party',
  bridal_shower: 'Bridal Shower',
  other: 'Other Celebration',
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  open: 'Open',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

export function categoryLabel(category: string): string {
  return EVENT_CATEGORY_LABELS[category as EventCategory] ?? 'Celebration'
}

export function formatEventDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-ZM', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

export function formatEventTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return value
  const hours = Number(match[1])
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${match[2]} ${suffix}`
}
