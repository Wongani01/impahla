import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import {
  createEvent,
  getEventsByPlanner,
  getOpenEvents,
  parseEventInput,
  searchEvents,
} from '@/lib/events-service'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const params = new URL(request.url).searchParams
  const mine = params.get('mine')
  const open = params.get('open')
  const query = params.get('q') ?? ''

  try {
    if (mine) {
      return NextResponse.json({ events: await getEventsByPlanner(user.id) })
    }
    if (open || query) {
      const events = query ? await searchEvents(query) : await getOpenEvents()
      return NextResponse.json({ events })
    }
    return NextResponse.json({ events: await getOpenEvents() })
  } catch (error) {
    console.error('list events failed', error)
    return apiError('Could not load events. Is the database running?', 500)
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)
  if (user.role !== 'planner' && user.role !== 'admin') {
    return apiError('Only event planners, bride, and groom can create events.', 403)
  }

  const parsed = parseEventInput(await request.json().catch(() => null))
  if (!parsed.ok) return apiError(parsed.error, 400)

  try {
    const event = await createEvent(parsed.value, user.id)
    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('create event failed', error)
    return apiError('Could not create this event.', 500)
  }
}
