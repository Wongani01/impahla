import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { apiError, readString } from '@/lib/api'
import { getCurrentUser, checkDatabase } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { fallbackStore } from '@/lib/db/fallback-store'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const online = await checkDatabase().catch(() => false)
  if (online) {
    try {
      const rows = await db.select().from(events)
      return NextResponse.json({ events: rows })
    } catch {
      // fallback
    }
  }

  return NextResponse.json({ events: fallbackStore.getEvents() })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)
  if (user.role !== 'planner' && user.role !== 'admin') {
    return apiError('Only event planners, bride, and groom can create events.', 403)
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return apiError('Invalid request body.')
  }

  const eventName = readString(body?.eventName)
  const eventType = readString(body?.eventType) || 'Kitchen Party'
  const eventDate = readString(body?.eventDate) || '2026-11-28'
  const location = readString(body?.location) || 'Lusaka, Zambia'
  const description = readString(body?.description) || ''
  const hostName = readString(body?.hostName) || user.name
  const eventTime = readString(body?.eventTime) || '14:00'
  const venue = readString(body?.venue) || ''
  const contactInfo = readString(body?.contactInfo) || ''
  const expectedAttendees = Number(body?.expectedAttendees ?? 50)
  const coverImage = typeof body?.coverImage === 'string' ? body.coverImage : null

  if (!eventName) return apiError('Event name is required.')

  const id = randomUUID()
  const online = await checkDatabase().catch(() => false)

  if (online) {
    try {
      await db.insert(events).values({
        id,
        plannerId: user.id,
        plannerName: user.name,
        eventName,
        description,
        category: eventType,
        eventType,
        hostName,
        eventDate,
        eventTime,
        venue,
        location,
        contactInfo,
        expectedAttendees,
        coverImage,
        status: 'active',
      })
      return NextResponse.json({ event: { id, plannerId: user.id, plannerName: user.name, eventName, description, category: eventType, eventType, hostName, eventDate, eventTime, venue, location, contactInfo, expectedAttendees, coverImage, status: 'active' } }, { status: 201 })
    } catch {
      // fallback
    }
  }

  const eventObj = fallbackStore.saveEvent({
    id,
    plannerId: user.id,
    plannerName: user.name,
    eventName,
    description,
    category: eventType,
    eventType,
    hostName,
    eventDate,
    eventTime,
    venue,
    location,
    contactInfo,
    expectedAttendees,
    coverImage,
    status: 'active',
  })

  return NextResponse.json({ event: eventObj }, { status: 201 })
}
