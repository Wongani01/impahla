import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { apiError } from '@/lib/api'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/auth/session'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const actor = await getCurrentUser()
  if (!actor) return apiError('Please sign in.', 401)
  if (actor.role !== 'admin') return apiError('Administrator access required.', 403)

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

  const update: { role?: 'user' | 'admin'; status?: 'active' | 'disabled' } = {}
  if (body.role === 'user' || body.role === 'admin') update.role = body.role
  if (body.status === 'active' || body.status === 'disabled') update.status = body.status
  if (!Object.keys(update).length) return apiError('Nothing to update.')

  if (id === actor.id && (update.role === 'user' || update.status === 'disabled')) {
    return apiError('You cannot change your own role or disable your own account.')
  }

  try {
    await db.update(users).set(update).where(eq(users.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('update user failed', error)
    return apiError('Could not update this user.', 500)
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const actor = await getCurrentUser()
  if (!actor) return apiError('Please sign in.', 401)
  if (actor.role !== 'admin') return apiError('Administrator access required.', 403)

  const { id } = await params
  if (id === actor.id) return apiError('You cannot delete your own account.')

  try {
    await db.delete(users).where(eq(users.id, id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('delete user failed', error)
    return apiError('Could not delete this user.', 500)
  }
}
