import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contributions, users } from '@/lib/db/schema'
import { checkDatabase } from '@/lib/auth/session'
import { fallbackStore } from '@/lib/db/fallback-store'
import type { AdminContribution, Contribution, ContributionStatus } from '@/lib/contribution-store'

export type ContributionInput = {
  id: string
  eventId: string
  name: string
  phoneNumber: string
  contributionType: 'cash' | 'gift'
  amount: number
  paidAmount: number
  gift: string
  giftValue: number
  quantity: number
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
  const eventId = typeof body.eventId === 'string' && body.eventId.length > 0 ? body.eventId : 'default-event'
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : ''
  const contributionType = body.contributionType === 'gift' ? 'gift' : 'cash'
  const gift = typeof body.gift === 'string' ? body.gift.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : ''
  const status = (['promised', 'received', 'pledged', 'paid', 'pending_verification', 'confirmed', 'delivered', 'cancelled'].includes(body.status as string)
    ? body.status
    : 'received') as ContributionStatus
  const amount = Number(body.amount ?? 0)
  const paidAmount = Number(body.paidAmount ?? 0)
  const giftValue = Number(body.giftValue ?? 0)
  const quantity = Number(body.quantity ?? 1)
  const photo = body.photo

  if (name.length < 2) return { ok: false, error: 'Add the contributor’s name.' }
  if (name.length > 120) return { ok: false, error: 'Contributor name is too long.' }
  if (!Number.isInteger(amount) || amount < 0) return { ok: false, error: 'Enter a valid total cash amount.' }
  if (!Number.isInteger(paidAmount) || paidAmount < 0) return { ok: false, error: 'Enter a valid paid amount.' }
  if (paidAmount > amount) return { ok: false, error: 'Paid amount cannot exceed total pledged amount.' }
  if (!status) return { ok: false, error: 'Choose a status for this contribution.' }
  if (!date) return { ok: false, error: 'Choose a valid date.' }

  let resolvedPhoto: string | null = null
  if (typeof photo === 'string' && photo.length > 0) {
    if (!photo.startsWith('data:image/') || photo.length > MAX_PHOTO_CHARS) {
      return { ok: false, error: 'That gift photo is not valid.' }
    }
    resolvedPhoto = photo
  }

  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id.slice(0, 36) : randomUUID()

  return { ok: true, value: { id, eventId, name, phoneNumber, contributionType, amount, paidAmount, gift, giftValue, quantity, status, note, date, photo: resolvedPhoto } }
}

function toContribution(row: {
  id: string
  eventId?: string
  name: string
  phoneNumber?: string
  contributionType?: 'cash' | 'gift'
  amount: number
  paidAmount?: number
  gift: string
  giftValue?: number
  quantity?: number
  status: ContributionStatus
  note: string
  date: string
  photo: string | null
}): Contribution {
  return {
    id: row.id,
    eventId: row.eventId ?? 'default-event',
    name: row.name,
    amount: row.amount,
    paidAmount: row.paidAmount ?? 0,
    gift: row.gift,
    status: row.status,
    note: row.note,
    date: row.date,
    ...(row.photo ? { photo: row.photo } : {}),
  }
}

const columns = {
  id: contributions.id,
  eventId: contributions.eventId,
  name: contributions.name,
  phoneNumber: contributions.phoneNumber,
  contributionType: contributions.contributionType,
  amount: contributions.amount,
  paidAmount: contributions.paidAmount,
  gift: contributions.gift,
  giftValue: contributions.giftValue,
  quantity: contributions.quantity,
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
        eventId: input.eventId,
        name: input.name,
        phoneNumber: input.phoneNumber,
        contributionType: input.contributionType,
        amount: input.amount,
        paidAmount: input.paidAmount,
        gift: input.gift,
        giftValue: input.giftValue,
        quantity: input.quantity,
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
    eventId: input.eventId,
    name: input.name,
    phoneNumber: input.phoneNumber,
    contributionType: input.contributionType,
    amount: input.amount,
    paidAmount: input.paidAmount,
    gift: input.gift,
    giftValue: input.giftValue,
    quantity: input.quantity,
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
            eventId: input.eventId,
            name: input.name,
            phoneNumber: input.phoneNumber,
            contributionType: input.contributionType,
            amount: input.amount,
            paidAmount: input.paidAmount,
            gift: input.gift,
            giftValue: input.giftValue,
            quantity: input.quantity,
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
    eventId: input.eventId,
    name: input.name,
    phoneNumber: input.phoneNumber,
    contributionType: input.contributionType,
    amount: input.amount,
    paidAmount: input.paidAmount,
    gift: input.gift,
    giftValue: input.giftValue,
    quantity: input.quantity,
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
