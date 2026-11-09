import { randomUUID } from 'node:crypto'
import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contributions, events } from '@/lib/db/schema'
import { checkDatabase } from '@/lib/auth/session'
import { fallbackStore, type MemoryContribution } from '@/lib/db/fallback-store'
import type { EventCategory, EventRecord, EventStatus, EventSummary } from '@/lib/event-store'
import type { Contribution, ContributionStatus, ContributionType } from '@/lib/contribution-store'

const MAX_IMAGE_CHARS = 4_000_000
const EVENT_CATEGORY_VALUES: EventCategory[] = ['kitchen_party', 'bridal_shower', 'other']
const CONTRIBUTION_TYPE_VALUES: ContributionType[] = ['cash', 'gift']
const CONTRIBUTION_STATUS_VALUES: ContributionStatus[] = [
  'pledged',
  'paid',
  'pending_verification',
  'confirmed',
  'delivered',
  'received',
  'cancelled',
]
const CASH_IN_HAND: ContributionStatus[] = ['paid', 'confirmed', 'delivered', 'received']
const GIFT_RECEIVED: ContributionStatus[] = ['delivered', 'received', 'confirmed']
const OUTSTANDING: ContributionStatus[] = ['pledged', 'pending_verification']

export type EventInput = {
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
}

export type ContributionInput = {
  id: string
  eventId: string
  contributorId: string | null
  contributorName: string
  phoneNumber: string
  contributionType: ContributionType
  cashAmount: number
  giftDescription: string
  giftValue: number | null
  quantity: number
  giftImage: string | null
  note: string
  contributionStatus: ContributionStatus
  date: string
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asInt(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

/** Normalise a MySQL DATE (returned by Drizzle as a Date) to a `YYYY-MM-DD` string. */
function dateOnly(value: Date | string | null | undefined): string {
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return String(value ?? '').slice(0, 10)
}

/** Convert a `YYYY-MM-DD` string to a Date at local noon so the date never shifts across timezones. */
function dateOnlyToDate(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export function parseEventInput(raw: unknown): { ok: true; value: EventInput } | { ok: false; error: string } {
  const body = (raw ?? {}) as Record<string, unknown>
  const eventName = asString(body.eventName)
  const description = asString(body.description)
  const categoryRaw = asString(body.category) || 'kitchen_party'
  const hostName = asString(body.hostName)
  const eventDate = asString(body.eventDate)
  const eventTime = asString(body.eventTime)
  const venue = asString(body.venue)
  const location = asString(body.location)
  const contactInfo = asString(body.contactInfo)
  const expectedAttendees = asInt(body.expectedAttendees, 0)
  const coverImageRaw = body.coverImage

  if (eventName.length < 2) return { ok: false, error: 'Add the event name.' }
  if (eventName.length > 160) return { ok: false, error: 'Event name is too long.' }
  if (hostName.length < 2) return { ok: false, error: 'Add the host name.' }
  if (hostName.length > 120) return { ok: false, error: 'Host name is too long.' }
  if (!EVENT_CATEGORY_VALUES.includes(categoryRaw as EventCategory)) {
    return { ok: false, error: 'Choose a valid event category.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return { ok: false, error: 'Choose a valid event date.' }
  if (!eventTime || eventTime.length > 8) return { ok: false, error: 'Add a valid event time.' }
  if (venue.length < 2) return { ok: false, error: 'Add the venue.' }
  if (venue.length > 160) return { ok: false, error: 'Venue is too long.' }
  if (location.length < 2) return { ok: false, error: 'Add the location.' }
  if (location.length > 255) return { ok: false, error: 'Location is too long.' }
  if (contactInfo.length < 3) return { ok: false, error: 'Add contact information.' }
  if (contactInfo.length > 120) return { ok: false, error: 'Contact information is too long.' }
  if (expectedAttendees < 0) return { ok: false, error: 'Expected attendees cannot be negative.' }

  let coverImage: string | null = null
  if (typeof coverImageRaw === 'string' && coverImageRaw.length > 0) {
    if (!coverImageRaw.startsWith('data:image/') || coverImageRaw.length > MAX_IMAGE_CHARS) {
      return { ok: false, error: 'That cover image is not valid.' }
    }
    coverImage = coverImageRaw
  }

  return {
    ok: true,
    value: {
      eventName,
      description,
      category: categoryRaw as EventCategory,
      hostName,
      eventDate,
      eventTime,
      venue,
      location,
      contactInfo,
      expectedAttendees,
      coverImage,
    },
  }
}

export function parseContributionInput(
  raw: unknown,
  context: { eventId: string; contributorId: string | null },
): { ok: true; value: ContributionInput } | { ok: false; error: string } {
  const body = (raw ?? {}) as Record<string, unknown>
  const contributorName = asString(body.contributorName)
  const phoneNumber = asString(body.phoneNumber)
  const contributionType = asString(body.contributionType) as ContributionType
  const giftDescription = asString(body.giftDescription)
  const note = asString(body.note)
  const date = asString(body.date) || new Date().toISOString().slice(0, 10)
  const cashAmount = asInt(body.cashAmount, 0)
  const giftValue = body.giftValue === null || body.giftValue === undefined || body.giftValue === '' ? null : asInt(body.giftValue, 0)
  const quantity = asInt(body.quantity, 1)
  const giftImageRaw = body.giftImage

  if (!CONTRIBUTION_TYPE_VALUES.includes(contributionType)) {
    return { ok: false, error: "Choose either a cash or gift contribution." }
  }
  if (contributorName.length < 2) return { ok: false, error: 'Add your full name.' }
  if (contributorName.length > 120) return { ok: false, error: 'Your name is too long.' }
  if (phoneNumber.length < 7) return { ok: false, error: 'Add a valid phone number.' }
  if (phoneNumber.length > 30) return { ok: false, error: 'Phone number is too long.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Choose a valid date.' }

  if (contributionType === 'cash') {
    if (cashAmount <= 0) return { ok: false, error: 'Enter a cash amount greater than zero.' }
  } else {
    if (giftDescription.length < 2) return { ok: false, error: 'Describe the gift you are contributing.' }
    if (giftDescription.length > 255) return { ok: false, error: 'Gift description is too long.' }
    if (quantity < 1) return { ok: false, error: 'Quantity must be at least one.' }
  }
  if (giftValue !== null && giftValue < 0) return { ok: false, error: 'Estimated value cannot be negative.' }

  let giftImage: string | null = null
  if (typeof giftImageRaw === 'string' && giftImageRaw.length > 0) {
    if (!giftImageRaw.startsWith('data:image/') || giftImageRaw.length > MAX_IMAGE_CHARS) {
      return { ok: false, error: 'That gift photo is not valid.' }
    }
    giftImage = giftImageRaw
  }

  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id.slice(0, 36) : randomUUID()

  // Contribution always starts as a pledge unless the caller supplies a valid status.
  const requestedStatus = asString(body.contributionStatus) as ContributionStatus
  const contributionStatus =
    context.eventId && CONTRIBUTION_STATUS_VALUES.includes(requestedStatus) ? requestedStatus : 'pledged'

  return {
    ok: true,
    value: {
      id,
      eventId: context.eventId,
      contributorId: context.contributorId,
      contributorName,
      phoneNumber,
      contributionType,
      cashAmount: contributionType === 'cash' ? cashAmount : 0,
      giftDescription: contributionType === 'gift' ? giftDescription : '',
      giftValue,
      quantity: contributionType === 'gift' ? quantity : 1,
      giftImage,
      note,
      contributionStatus,
      date,
    },
  }
}

/* ------------------------------------------------------------------ */
/* Mappers                                                             */
/* ------------------------------------------------------------------ */

type EventRow = {
  id: string
  plannerId: string
  eventName: string
  description: string
  category: EventCategory
  hostName: string
  eventDate: Date | string
  eventTime: string
  venue: string
  location: string
  contactInfo: string
  expectedAttendees: number
  coverImage: string | null
  status: EventStatus
  createdAt?: Date | string
  updatedAt?: Date | string
}

function toEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    plannerId: row.plannerId,
    eventName: row.eventName,
    description: row.description,
    category: row.category,
    hostName: row.hostName,
    eventDate: dateOnly(row.eventDate),
    eventTime: row.eventTime,
    venue: row.venue,
    location: row.location,
    contactInfo: row.contactInfo,
    expectedAttendees: row.expectedAttendees,
    coverImage: row.coverImage,
    status: row.status,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  }
}

type ContributionRow = {
  id: string
  eventId: string
  contributorId: string | null
  contributorName: string
  phoneNumber: string
  contributionType: ContributionType
  cashAmount: number
  giftDescription: string
  giftValue: number | null
  quantity: number
  giftImage: string | null
  note: string
  contributionStatus: ContributionStatus
  date: string
}

function toContribution(row: ContributionRow | MemoryContribution): Contribution {
  return {
    id: row.id,
    eventId: row.eventId,
    contributorId: row.contributorId ?? null,
    contributorName: row.contributorName,
    phoneNumber: row.phoneNumber,
    contributionType: row.contributionType,
    cashAmount: row.cashAmount,
    giftDescription: row.giftDescription,
    giftValue: row.giftValue ?? null,
    quantity: row.quantity,
    giftImage: row.giftImage ?? null,
    note: row.note,
    contributionStatus: row.contributionStatus,
    date: row.date,
  }
}

async function online(): Promise<boolean> {
  return checkDatabase().catch(() => false)
}

/* ------------------------------------------------------------------ */
/* Event helpers                                                       */
/* ------------------------------------------------------------------ */

export async function createEvent(data: EventInput, plannerId: string): Promise<EventRecord> {
  const id = randomUUID()
  if (await online()) {
    try {
      await db.insert(events).values({
        id,
        plannerId,
        eventName: data.eventName,
        description: data.description,
        category: data.category,
        hostName: data.hostName,
        eventDate: dateOnlyToDate(data.eventDate),
        eventTime: data.eventTime,
        venue: data.venue,
        location: data.location,
        contactInfo: data.contactInfo,
        expectedAttendees: data.expectedAttendees,
        coverImage: data.coverImage,
        status: 'open',
      })
      const row = await db.select().from(events).where(eq(events.id, id)).limit(1)
      if (row[0]) return toEvent(row[0])
      return toEvent({ id, plannerId, status: 'open', createdAt: new Date(), updatedAt: new Date(), ...data })
    } catch (error) {
      console.error('createEvent failed, using fallback store', error)
    }
  }

  const saved = fallbackStore.saveEvent({ id, plannerId, status: 'open', ...data })
  return toEvent(saved)
}

export async function getEventsByPlanner(plannerId: string): Promise<EventRecord[]> {
  if (await online()) {
    try {
      const rows = await db.select().from(events).where(eq(events.plannerId, plannerId)).orderBy(desc(events.eventDate))
      return rows.map(toEvent)
    } catch (error) {
      console.error('getEventsByPlanner failed, using fallback store', error)
    }
  }
  return fallbackStore
    .getEvents()
    .filter((event) => event.plannerId === plannerId)
    .map(toEvent)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
}

export async function getOpenEvents(): Promise<EventRecord[]> {
  if (await online()) {
    try {
      const rows = await db.select().from(events).where(eq(events.status, 'open')).orderBy(events.eventDate)
      return rows.map(toEvent)
    } catch (error) {
      console.error('getOpenEvents failed, using fallback store', error)
    }
  }
  return fallbackStore
    .getEvents()
    .filter((event) => event.status === 'open')
    .map(toEvent)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
}

export async function searchEvents(query: string): Promise<EventRecord[]> {
  const term = query.trim()
  if (!term) return getOpenEvents()

  if (await online()) {
    try {
      const pattern = `%${term}%`
      const rows = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.status, 'open'),
            or(like(events.eventName, pattern), like(events.hostName, pattern), like(events.venue, pattern)),
          ),
        )
        .orderBy(events.eventDate)
      return rows.map(toEvent)
    } catch (error) {
      console.error('searchEvents failed, using fallback store', error)
    }
  }

  const needle = term.toLocaleLowerCase()
  return fallbackStore
    .getEvents()
    .filter(
      (event) =>
        event.status === 'open' &&
        [event.eventName, event.hostName, event.venue].some((value) => value.toLocaleLowerCase().includes(needle)),
    )
    .map(toEvent)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
}

export async function getEventById(id: string): Promise<EventRecord | null> {
  if (await online()) {
    try {
      const rows = await db.select().from(events).where(eq(events.id, id)).limit(1)
      if (rows[0]) return toEvent(rows[0])
      return null
    } catch (error) {
      console.error('getEventById failed, using fallback store', error)
    }
  }
  const fallbackEvent = fallbackStore.getEventById(id)
  return fallbackEvent ? toEvent(fallbackEvent) : null
}

export async function updateEvent(id: string, data: EventInput): Promise<EventRecord | null> {
  if (await online()) {
    try {
      const existing = await db.select({ id: events.id }).from(events).where(eq(events.id, id)).limit(1)
      if (!existing.length) return null
      await db
        .update(events)
        .set({
          eventName: data.eventName,
          description: data.description,
          category: data.category,
          hostName: data.hostName,
          eventDate: dateOnlyToDate(data.eventDate),
          eventTime: data.eventTime,
          venue: data.venue,
          location: data.location,
          contactInfo: data.contactInfo,
          expectedAttendees: data.expectedAttendees,
          coverImage: data.coverImage,
        })
        .where(eq(events.id, id))
      const rows = await db.select().from(events).where(eq(events.id, id)).limit(1)
      return rows[0] ? toEvent(rows[0]) : null
    } catch (error) {
      console.error('updateEvent failed, using fallback store', error)
    }
  }

  const target = fallbackStore.getEventById(id)
  if (!target) return null
  const saved = fallbackStore.saveEvent({ ...target, ...data })
  return toEvent(saved)
}

export async function closeEvent(id: string): Promise<EventRecord | null> {
  if (await online()) {
    try {
      const existing = await db.select({ id: events.id }).from(events).where(eq(events.id, id)).limit(1)
      if (!existing.length) return null
      await db.update(events).set({ status: 'closed' }).where(eq(events.id, id))
      const rows = await db.select().from(events).where(eq(events.id, id)).limit(1)
      return rows[0] ? toEvent(rows[0]) : null
    } catch (error) {
      console.error('closeEvent failed, using fallback store', error)
    }
  }

  const target = fallbackStore.getEventById(id)
  if (!target) return null
  const saved = fallbackStore.saveEvent({ ...target, status: 'closed' })
  return toEvent(saved)
}

/* ------------------------------------------------------------------ */
/* Contribution helpers                                                */
/* ------------------------------------------------------------------ */

export async function createContribution(data: ContributionInput): Promise<Contribution> {
  const safe: ContributionInput = {
    ...data,
    contributionStatus: data.contributionStatus ?? 'pledged',
  }

  if (await online()) {
    try {
      await db.insert(contributions).values({
        id: safe.id,
        eventId: safe.eventId,
        contributorId: safe.contributorId,
        contributorName: safe.contributorName,
        phoneNumber: safe.phoneNumber,
        contributionType: safe.contributionType,
        cashAmount: safe.cashAmount,
        giftDescription: safe.giftDescription,
        giftValue: safe.giftValue,
        quantity: safe.quantity,
        giftImage: safe.giftImage,
        note: safe.note,
        contributionStatus: safe.contributionStatus,
        date: safe.date,
      })
      return toContribution(safe as ContributionRow)
    } catch (error) {
      console.error('createContribution failed, using fallback store', error)
    }
  }

  const saved = fallbackStore.saveContribution(safe)
  return toContribution(saved)
}

export async function getContributionsByEvent(eventId: string): Promise<Contribution[]> {
  if (await online()) {
    try {
      const rows = await db
        .select()
        .from(contributions)
        .where(eq(contributions.eventId, eventId))
        .orderBy(desc(contributions.createdAt))
      return rows.map(toContribution)
    } catch (error) {
      console.error('getContributionsByEvent failed, using fallback store', error)
    }
  }
  return fallbackStore
    .getContributionsByEvent(eventId)
    .map(toContribution)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function getContributionById(id: string): Promise<Contribution | null> {
  if (await online()) {
    try {
      const rows = await db.select().from(contributions).where(eq(contributions.id, id)).limit(1)
      return rows[0] ? toContribution(rows[0]) : null
    } catch (error) {
      console.error('getContributionById failed, using fallback store', error)
    }
  }
  const found = fallbackStore.getContributions().find((item) => item.id === id)
  return found ? toContribution(found) : null
}

export function isValidContributionStatus(status: string): status is ContributionStatus {
  return CONTRIBUTION_STATUS_VALUES.includes(status as ContributionStatus)
}

export async function updateContributionStatus(id: string, status: ContributionStatus): Promise<Contribution | null> {
  if (!isValidContributionStatus(status)) return null

  if (await online()) {
    try {
      const existing = await db.select({ id: contributions.id }).from(contributions).where(eq(contributions.id, id)).limit(1)
      if (!existing.length) return null
      await db.update(contributions).set({ contributionStatus: status }).where(eq(contributions.id, id))
      const rows = await db.select().from(contributions).where(eq(contributions.id, id)).limit(1)
      return rows[0] ? toContribution(rows[0]) : null
    } catch (error) {
      console.error('updateContributionStatus failed, using fallback store', error)
    }
  }

  const target = fallbackStore.getContributions().find((item) => item.id === id)
  if (!target) return null
  const saved = fallbackStore.saveContribution({ ...target, contributionStatus: status })
  return toContribution(saved)
}

export async function getEventSummary(eventId: string): Promise<EventSummary> {
  if (await online()) {
    try {
      const rows = await db
        .select({
          totalContributors: sql<number>`COUNT(DISTINCT ${contributions.contributorName})`,
          totalCash: sql<number>`COALESCE(SUM(CASE WHEN ${contributions.contributionStatus} IN ('paid','confirmed','delivered','received') THEN ${contributions.cashAmount} ELSE 0 END), 0)`,
          giftsPledged: sql<number>`COALESCE(SUM(CASE WHEN ${contributions.contributionType} = 'gift' THEN 1 ELSE 0 END), 0)`,
          giftsReceived: sql<number>`COALESCE(SUM(CASE WHEN ${contributions.contributionType} = 'gift' AND ${contributions.contributionStatus} IN ('delivered','received','confirmed') THEN 1 ELSE 0 END), 0)`,
          outstanding: sql<number>`COALESCE(SUM(CASE WHEN ${contributions.contributionStatus} IN ('pledged','pending_verification') THEN ${contributions.cashAmount} ELSE 0 END), 0)`,
        })
        .from(contributions)
        .where(eq(contributions.eventId, eventId))

      const row = rows[0]
      return {
        totalContributors: Number(row?.totalContributors ?? 0),
        totalCash: Number(row?.totalCash ?? 0),
        giftsPledged: Number(row?.giftsPledged ?? 0),
        giftsReceived: Number(row?.giftsReceived ?? 0),
        outstanding: Number(row?.outstanding ?? 0),
      }
    } catch (error) {
      console.error('getEventSummary failed, using fallback store', error)
    }
  }

  const items = fallbackStore.getContributionsByEvent(eventId)
  const people = new Set<string>()
  let totalCash = 0
  let giftsPledged = 0
  let giftsReceived = 0
  let outstanding = 0
  for (const item of items) {
    people.add(item.contributorName.trim().toLocaleLowerCase())
    if (item.contributionType === 'gift') {
      giftsPledged += 1
      if (GIFT_RECEIVED.includes(item.contributionStatus)) giftsReceived += 1
    } else {
      if (CASH_IN_HAND.includes(item.contributionStatus)) totalCash += item.cashAmount
      if (OUTSTANDING.includes(item.contributionStatus)) outstanding += item.cashAmount
    }
  }
  return { totalContributors: people.size, totalCash, giftsPledged, giftsReceived, outstanding }
}
