import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { apiError, normalizeEmail } from '@/lib/api'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { verifyPassword } from '@/lib/auth/password'
import { createSession, checkDatabase } from '@/lib/auth/session'
import { fallbackStore } from '@/lib/db/fallback-store'

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return apiError('Invalid request body.')
  }

  const body = payload as Record<string, unknown>
  const email = normalizeEmail(body?.email)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) return apiError('Enter your email and password.')

  const online = await checkDatabase().catch(() => false)

  if (!online) {
    const user = fallbackStore.getUserByEmail(email)
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return apiError('Those details don’t match an account.', 401)
    }
    if (user.status !== 'active') {
      return apiError('This account has been disabled. Please contact an administrator.', 403)
    }

    await createSession(user.id)
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
    })
  }

  try {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const user = rows[0]
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return apiError('Those details don’t match an account.', 401)
    }
    if (user.status !== 'active') {
      return apiError('This account has been disabled. Please contact an administrator.', 403)
    }

    await createSession(user.id)
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
    })
  } catch (error) {
    try {
      const user = fallbackStore.getUserByEmail(email)
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return apiError('Those details don’t match an account.', 401)
      }
      if (user.status !== 'active') {
        return apiError('This account has been disabled. Please contact an administrator.', 403)
      }

      await createSession(user.id)
      return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
      })
    } catch (fallbackError) {
      console.error('login failed', error, fallbackError)
      return apiError('Could not sign you in. Please try again.', 500)
    }
  }
}
