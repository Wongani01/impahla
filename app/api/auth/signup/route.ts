import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { apiError, normalizeEmail, readString } from '@/lib/api'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
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
  const name = readString(body?.name)
  const email = normalizeEmail(body?.email)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (name.length < 2) return apiError('Please enter your full name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError('Please enter a valid email address.')
  if (password.length < 8) return apiError('Your password must be at least 8 characters.')

  const online = await checkDatabase().catch(() => false)

  if (!online) {
    const existing = fallbackStore.getUserByEmail(email)
    if (existing) return apiError('An account with that email already exists.', 409)

    const id = randomUUID()
    const hashed = await hashPassword(password)
    fallbackStore.saveUser({
      id,
      name,
      email,
      passwordHash: hashed,
      role: 'user',
      status: 'active',
    })
    await createSession(id)
    return NextResponse.json({ user: { id, name, email, role: 'user', status: 'active' } }, { status: 201 })
  }

  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (existing.length) return apiError('An account with that email already exists.', 409)

    const id = randomUUID()
    await db.insert(users).values({
      id,
      name,
      email,
      passwordHash: await hashPassword(password),
      role: 'user',
      status: 'active',
    })

    await createSession(id)
    return NextResponse.json({ user: { id, name, email, role: 'user', status: 'active' } }, { status: 201 })
  } catch (error) {
    try {
      const existing = fallbackStore.getUserByEmail(email)
      if (existing) return apiError('An account with that email already exists.', 409)

      const id = randomUUID()
      const hashed = await hashPassword(password)
      fallbackStore.saveUser({
        id,
        name,
        email,
        passwordHash: hashed,
        role: 'user',
        status: 'active',
      })
      await createSession(id)
      return NextResponse.json({ user: { id, name, email, role: 'user', status: 'active' } }, { status: 201 })
    } catch (fallbackError) {
      console.error('signup failed', error, fallbackError)
      return apiError('Could not create your account. Please try again.', 500)
    }
  }
}
