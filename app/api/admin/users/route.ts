import { NextResponse } from 'next/server'
import { count, desc, eq } from 'drizzle-orm'
import { apiError } from '@/lib/api'
import { db } from '@/lib/db'
import { contributions, users } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)
  if (user.role !== 'admin') return apiError('Administrator access required.', 403)

  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        contributionCount: count(contributions.id),
      })
      .from(users)
      .leftJoin(contributions, eq(contributions.contributorId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))

    return NextResponse.json({ users: rows })
  } catch (error) {
    console.error('list users failed', error)
    return apiError('Could not load users. Is the database running?', 500)
  }
}
