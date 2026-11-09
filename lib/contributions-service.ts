import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contributions, users } from '@/lib/db/schema'
import { checkDatabase } from '@/lib/auth/session'
import { fallbackStore } from '@/lib/db/fallback-store'
import type { AdminContribution, Contribution, ContributionStatus } from '@/lib/contribution-store'

export type ContributionInput = {
  id: string
  name: string
  amount: number
  gift: string
  status: ContributionStatus
  note: string
  date: string
  photo: string | null
}

const MAX_PHOTO_CHARS = 4_000_000

export function parseContributionInput(
  raw: unknown,
): { ok: true; value: ContributionInput } | { ok: false; error: string } {
  const body = (raw ?? {}) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const gift = typeof body.gift === 'string' ? body.gift.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : ''
  const status = body.status === 'promised' ? 'promised' : body.status === 'received' ? 'received' : ''
  const amount = Number(body.amount ?? 0)
  const photo = body.photo

  if (name.length < 2) return { ok: false, error: 'Add the contributor’s name.' }
  if (name.length > 120) return { ok: false, error: 'Contributor name is too long.' }
  if (!Number.isInteger(amount) || amount < 0) return { ok: false, error: 'Enter a valid cash amount.' }
  if (!status) return { ok: false, error: 'Choose a status for this contribution.' }
  if (!date) return { ok: false, error: 'Choose a valid date.' }
  if (amount === 0 && !gift) return { ok: false, error: 'Add a cash amount or describe the gift.' }
  if (gift.length > 255) return { ok: false, error: 'Gift description is too long.' }
  if (note.length > 2000) return { ok: false, error: 'Note is too long.' }

  let resolvedPhoto: string | null = null
  if (typeof photo === 'string' && photo.length > 0) {
    if (!photo.startsWith('data:image/') || photo.length > MAX_PHOTO_CHARS) {
      return { ok: false, error: 'That gift photo is not valid.' }
    }
    resolvedPhoto = photo
  }

  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id.slice(0, 36) : randomUUID()

  return { ok: true, value: { id, name, amount, gift, status, note, date, photo: resolvedPhoto } }
}

function toContribution(row: {
  id: string
  name: string
  amount: number
  gift: string
  status: ContributionStatus
  note: string
  date: string
  photo: string | null
}): Contribution {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    gift: row.gift,
    status: row.status,
    note: row.note,
    date: row.date,
    ...(row.photo ? { photo: row.photo } : {}),
  }
}

const columns = {
  id: contributions.id,
  name: contributions.name,
  amount: contributions.amount,
  gift: contributions.gift,
  status: contributions.status,
  note: contributions.note,
  date: contributions.date,
  photo: contributions.photo,
}

export async function listOwnContributions(userId: string): Promise<Contribution[]> {
  const online = await checkDatabase().catch(() => false)
  if (online) {
    try {
      const rows = await db
        .select(columns)
        .from(contributions)
        .where(eq(contributions.userId, userId))
        .orderBy(desc(contributions.date), desc(contributions.createdAt))
      return rows.map(toContribution)
    } catch {
      // fallback
    }
  }

  const items = fallbackStore.getContributions(userId)
  return items.map(toContribution).sort((a, b) => b.date.localeCompare(a.date))
}

export async function listAllContributions(): Promise<AdminContribution[]> {
  const online = await checkDatabase().catch(() => false)
  if (online) {
    try {
      const rows = await db
        .select({ ...columns, ownerId: users.id, ownerName: users.name, ownerEmail: users.email })
        .from(contributions)
        .innerJoin(users, eq(contributions.userId, users.id))
        .orderBy(desc(contributions.date), desc(contributions.createdAt))
      return rows.map((row) => ({ ...toContribution(row), ownerId: row.ownerId, ownerName: row.ownerName, ownerEmail: row.ownerEmail }))
    } catch {
      // fallback
    }
  }

  const items = fallbackStore.getContributions()
  const usersList = fallbackStore.getUsers()
  const userMap = new Map(usersList.map((u) => [u.id, u]))

  return items.map((item) => {
    const owner = userMap.get(item.userId)
    return {
      ...toContribution(item),
      ownerId: item.userId,
      ownerName: owner?.name ?? 'Unknown',
      ownerEmail: owner?.email ?? 'unknown@mphatso.local',
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

export async function createContribution(userId: string, input: ContributionInput): Promise<Contribution> {
  const online = await checkDatabase().catch(() => false)
  if (online) {
    try {
      await db.insert(contributions).values({
        id: input.id,
        userId,
        name: input.name,
        amount: input.amount,
        gift: input.gift,
        status: input.status,
        note: input.note,
        date: input.date,
        photo: input.photo,
      })
      return toContribution({ ...input, photo: input.photo })
    } catch {
      // fallback
    }
  }

  fallbackStore.saveContribution({
    id: input.id,
    userId,
    name: input.name,
    amount: input.amount,
    gift: input.gift,
    status: input.status,
    note: input.note,
    date: input.date,
    photo: input.photo,
  })
  return toContribution({ ...input, photo: input.photo })
}

export async function updateContribution(
  id: string,
  actorId: string,
  isAdmin: boolean,
  input: ContributionInput,
): Promise<Contribution | null> {
  const online = await checkDatabase().catch(() => false)
  if (online) {
    try {
      const where = isAdmin ? eq(contributions.id, id) : and(eq(contributions.id, id), eq(contributions.userId, actorId))
      const existing = await db.select({ id: contributions.id }).from(contributions).where(where).limit(1)
      if (existing.length) {
        await db
          .update(contributions)
          .set({
            name: input.name,
            amount: input.amount,
            gift: input.gift,
            status: input.status,
            note: input.note,
            date: input.date,
            photo: input.photo,
          })
          .where(eq(contributions.id, id))
        return toContribution({ ...input, id })
      }
    } catch {
      // fallback
    }
  }

  const items = fallbackStore.getContributions()
  const target = items.find((c) => c.id === id)
  if (!target) return null
  if (!isAdmin && target.userId !== actorId) return null

  fallbackStore.saveContribution({
    ...target,
    name: input.name,
    amount: input.amount,
    gift: input.gift,
    status: input.status,
    note: input.note,
    date: input.date,
    photo: input.photo,
  })
  return toContribution({ ...input, id })
}

export async function deleteContribution(id: string, actorId: string, isAdmin: boolean): Promise<boolean> {
  const online = await checkDatabase().catch(() => false)
  if (online) {
    try {
      const where = isAdmin ? eq(contributions.id, id) : and(eq(contributions.id, id), eq(contributions.userId, actorId))
      const existing = await db.select({ id: contributions.id }).from(contributions).where(where).limit(1)
      if (existing.length) {
        await db.delete(contributions).where(eq(contributions.id, id))
        return true
      }
    } catch {
      // fallback
    }
  }

  const items = fallbackStore.getContributions()
  const target = items.find((c) => c.id === id)
  if (!target) return false
  if (!isAdmin && target.userId !== actorId) return false
  fallbackStore.deleteContribution(id)
  return true
}
