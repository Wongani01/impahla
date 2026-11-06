import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { and, eq, gt, lt } from 'drizzle-orm'
import { db, pool } from '@/lib/db'
import { sessions, users } from '@/lib/db/schema'

export const SESSION_COOKIE = 'mphatso_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  status: 'active' | 'disabled'
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
  await db.insert(sessions).values({ id: token, userId, expiresAt })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await db.delete(sessions).where(eq(sessions.id, token))
  store.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
      .limit(1)

    const user = rows[0]
    if (!user || user.status !== 'active') return null
    return user
  } catch {
    return null
  }
}

export async function checkDatabase(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}
