import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import {
  getContributionById,
  getEventById,
  isValidContributionStatus,
  updateContributionStatus,
} from '@/lib/events-service'
import { deleteContribution, parseContributionInput, updateContribution } from '@/lib/contributions-service'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const { id } = await params
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

  // Status-only update: the planner's contribution table status dropdown.
  const isStatusOnly = Boolean(body && 'contributionStatus' in body && !('contributorName' in body))
  if (isStatusOnly) {
    const status = String(body?.contributionStatus ?? '')
    if (!isValidContributionStatus(status)) return apiError('Choose a valid status.', 400)

    const contribution = await getContributionById(id)
    if (!contribution) return apiError('Contribution not found.', 404)

    const event = await getEventById(contribution.eventId)
    if (!event) return apiError('Event not found.', 404)
    if (event.plannerId !== user.id && user.role !== 'admin') {
      return apiError('Only the event planner can update this contribution.', 403)
    }

    const updated = await updateContributionStatus(id, status)
    if (!updated) return apiError('Contribution not found.', 404)
    return NextResponse.json({ contribution: updated })
  }

  // Full update (admin console).
  const parsed = parseContributionInput(body)
  if (!parsed.ok) return apiError(parsed.error, 400)

  try {
    const contribution = await updateContribution(id, user.id, user.role === 'admin', { ...parsed.value, id })
    if (!contribution) return apiError('Contribution not found.', 404)
    return NextResponse.json({ contribution })
  } catch (error) {
    console.error('update contribution failed', error)
    return apiError('Could not update this contribution.', 500)
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const { id } = await params
  try {
    const removed = await deleteContribution(id, user.id, user.role === 'admin')
    if (!removed) return apiError('Contribution not found.', 404)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('delete contribution failed', error)
    return apiError('Could not remove this contribution.', 500)
  }
}
