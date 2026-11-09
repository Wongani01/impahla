import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import { getEventById, getEventSummary, parseEventInput, updateEvent } from '@/lib/events-service'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const { id } = await params
  try {
    const event = await getEventById(id)
    if (!event) return apiError('Event not found.', 404)
    const summary = await getEventSummary(id)
    return NextResponse.json({ event, summary })
  } catch (error) {
    console.error('get event failed', error)
    return apiError('Could not load this event. Is the database running?', 500)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const { id } = await params
  const existing = await getEventById(id)
  if (!existing) return apiError('Event not found.', 404)
  if (existing.plannerId !== user.id && user.role !== 'admin') {
    return apiError('Only the event planner can update this event.', 403)
  }

  const parsed = parseEventInput(await request.json().catch(() => null))
  if (!parsed.ok) return apiError(parsed.error, 400)

  try {
    const event = await updateEvent(id, parsed.value)
    if (!event) return apiError('Event not found.', 404)
    return NextResponse.json({ event })
  } catch (error) {
    console.error('update event failed', error)
    return apiError('Could not update this event.', 500)
  }
}
