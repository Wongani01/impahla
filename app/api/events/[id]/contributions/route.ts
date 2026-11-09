import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import {
  createContribution,
  getContributionsByEvent,
  getEventById,
  parseContributionInput,
} from '@/lib/events-service'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const { id } = await params
  const event = await getEventById(id)
  if (!event) return apiError('Event not found.', 404)
  if (event.plannerId !== user.id && user.role !== 'admin') {
    return apiError('Only the event planner can view these contribution records.', 403)
  }

  try {
    return NextResponse.json({ contributions: await getContributionsByEvent(id) })
  } catch (error) {
    console.error('list event contributions failed', error)
    return apiError('Could not load contributions. Is the database running?', 500)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const { id } = await params
  const event = await getEventById(id)
  if (!event) return apiError('Event not found.', 404)
  if (event.status !== 'open') return apiError('This event is no longer accepting contributions.', 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid request body.', 400)
  }

  const parsed = parseContributionInput(body, { eventId: id, contributorId: user.id })
  if (!parsed.ok) return apiError(parsed.error, 400)

  try {
    const contribution = await createContribution(parsed.value)
    return NextResponse.json({ contribution }, { status: 201 })
  } catch (error) {
    console.error('create contribution failed', error)
    return apiError('Could not save this contribution.', 500)
  }
}
