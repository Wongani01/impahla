import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import { closeEvent, getEventById } from '@/lib/events-service'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const { id } = await params
  const existing = await getEventById(id)
  if (!existing) return apiError('Event not found.', 404)
  if (existing.plannerId !== user.id && user.role !== 'admin') {
    return apiError('Only the event planner can close this event.', 403)
  }

  try {
    const event = await closeEvent(id)
    if (!event) return apiError('Event not found.', 404)
    return NextResponse.json({ event })
  } catch (error) {
    console.error('close event failed', error)
    return apiError('Could not close this event.', 500)
  }
}
