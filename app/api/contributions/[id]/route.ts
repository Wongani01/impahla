import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import { deleteContribution, parseContributionInput, updateContribution } from '@/lib/contributions-service'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const { id } = await params
  const parsed = parseContributionInput(await request.json().catch(() => null))
  if (!parsed.ok) return apiError(parsed.error)

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
