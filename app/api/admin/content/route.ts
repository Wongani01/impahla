import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { apiError, readString } from '@/lib/api'
import { db } from '@/lib/db'
import { siteContent } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/auth/session'

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { error: apiError('Please sign in.', 401) }
  if (user.role !== 'admin') return { error: apiError('Administrator access required.', 403) }
  return { error: null }
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const rows = await db.select().from(siteContent).orderBy(asc(siteContent.slug))
    return NextResponse.json({ content: rows })
  } catch (error) {
    console.error('list content failed', error)
    return apiError('Could not load site content. Is the database running?', 500)
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const slug = readString(body.slug)
  const title = readString(body.title)
  const text = typeof body.body === 'string' ? body.body.trim() : ''

  if (!slug) return apiError('Missing content key.')
  if (!title) return apiError('A title is required.')
  if (!text) return apiError('Content cannot be empty.')

  try {
    await db
      .insert(siteContent)
      .values({ slug, title, body: text })
      .onDuplicateKeyUpdate({ set: { title, body: text } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('update content failed', error)
    return apiError('Could not save site content.', 500)
  }
}
