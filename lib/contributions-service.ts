import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contributions, users } from '@/lib/db/schema'
import { checkDatabase } from '@/lib/auth/session'
import { fallbackStore } from '@/lib/db/fallback-store'
import type { AdminContribution, Contribution, ContributionStatus, ContributionType } from '@/lib/contribution-store'

export type ContributionInput = {
  id: string
  eventId: string
  contributorId: string | null
  contributorName: string
  phoneNumber: string
  contributionType: ContributionType
  cashAmount: number
  giftDescription: string
  giftValue: number | null
  quantity: number
  giftImage: string | null
  note: string
  contributionStatus: ContributionStatus
  date: string
}

const MAX_IMAGE_CHARS = 4_000_000
const STATUS_VALUES: ContributionStatus[] = [
  'pledged',
  'paid',
  'pending_verification',
  'confirmed',
  'delivered',
  'received',
  'cancelled',
]

export function parseContributionInput(
  raw: unknown,
): { ok: true; value: ContributionInput } | { ok: false; error: string } {
  const body = (raw ?? {}) as Record<string, unknown>
  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : ''
  const contributorName = typeof body.contributorName === 'string' ? body.contributorName.trim() : ''
  const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : ''
  const contributionType: ContributionType = body.contributionType === 'gift' ? 'gift' : 'cash'
  const giftDescription = typeof body.giftDescription === 'string' ? body.giftDescription.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10)
  const contributionStatus = STATUS_VALUES.includes(body.contributionStatus as ContributionStatus)
    ? (body.contributionStatus as ContributionStatus)
    : 'pledged'
  const cashAmount = Number(body.cashAmount ?? 0)
  const giftValueRaw = body.giftValue
  const giftValue = giftValueRaw === null || giftValueRaw === undefined || giftValueRaw === '' ? null : Number(giftValueRaw)
  const quantity = Number(body.quantity ?? 1)
  const image = body.giftImage
  const contributorId = typeof body.contributorId === 'string' && body.contributorId.length > 0 ? body.contributorId : null

  if (!eventId) return { ok: false, error: 'Select the event this contribution belongs to.' }
  if (contributorName.length < 2) return { ok: false, error: 'Add the contributor’s name.' }
  if (contributorName.length > 120) return { ok: false, error: 'Contributor name is too long.' }
  if (phoneNumber.length < 7) return { ok: false, error: 'Add a valid phone number.' }
  if (phoneNumber.length > 30) return { ok: false, error: 'Phone number is too long.' }
  if (!Number.isInteger(cashAmount) || cashAmount < 0) return { ok: false, error: 'Enter a valid cash amount.' }
  if (contributionType === 'cash' && cashAmount <= 0) return { ok: false, error: 'Enter a cash amount greater than zero.' }
  if (contributionType === 'gift' && giftDescription.length < 2) return { ok: false, error: 'Describe the gift being contributed.' }
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, error: 'Quantity must be at least one.' }
  if (giftValue !== null && (!Number.isInteger(giftValue) || giftValue < 0)) {
    return { ok: false, error: 'Enter a valid estimated gift value.' }
  }

  let giftImage: string | null = null
  if (typeof image === 'string' && image.length > 0) {
    if (!image.startsWith('data:image/') || image.length > MAX_IMAGE_CHARS) {
      return { ok: false, error: 'That gift photo is not valid.' }
    }
    giftImage = image
  }

  const id = typeof body.id === 'string' && body.id.length > 0 ? body.id.slice(0, 36) : randomUUID()

  return {
    ok: true,
    value: {
      id,
      eventId,
      contributorId,
      contributorName,
      phoneNumber,
      contributionType,
      cashAmount: contributionType === 'cash' ? cashAmount : 0,
      giftDescription: contributionType === 'gift' ? giftDescription : '',
      giftValue,
      quantity: contributionType === 'gift' ? quantity : 1,
      giftImage,
      note,
      contributionStatus,
      date,
    },
  }
}

function toContribution(row: ContributionInput | Contribution): Contribution {
  return {
    id: row.id,
    eventId: row.eventId,
    contributorId: row.contributorId ?? null,
    contributorName: row.contributorName,
    phoneNumber: row.phoneNumber,
    contributionType: row.contributionType,
    cashAmount: row.cashAmount,
    giftDescription: row.giftDescription,
    giftValue: row.giftValue ?? null,
    quantity: row.quantity,
    giftImage: row.giftImage ?? null,
    note: row.note,
    contributionStatus: row.contributionStatus,
    date: row.date,
  }
}

export async function listOwnContributions(userId: string): Promise<Contribution[]> {
  const online = await checkDatabase().catch(() => false)
  if (online) {
    try {
      const rows = await db
        .select()
        .from(contributions)
        .where(eq(contributions.contributorId, userId))
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
        .select({
          contribution: contributions,
          ownerId: users.id,
          ownerName: users.name,
          ownerEmail: users.email,
        })
        .from(contributions)
        .leftJoin(users, eq(contributions.contributorId, users.id))
        .orderBy(desc(contributions.date), desc(contributions.createdAt))
      return rows.map((row) => ({
        ...toContribution(row.contribution),
        ownerId: row.ownerId ?? null,
        ownerName: row.ownerName ?? 'Guest contributor',
        ownerEmail: row.ownerEmail ?? '—',
      }))
    } catch {
      // fallback
    }
  }

  const items = fallbackStore.getContributions()
  const userMap = new Map(fallbackStore.getUsers().map((u) => [u.id, u]))

  return items
    .map((item) => {
      const owner = item.contributorId ? userMap.get(item.contributorId) : undefined
      return {
        ...toContribution(item),
        ownerId: item.contributorId ?? null,
        ownerName: owner?.name ?? 'Guest contributor',
        ownerEmail: owner?.email ?? '—',
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function createContribution(userId: string, input: ContributionInput): Promise<Contribution> {
  const value = { ...input, contributorId: input.contributorId ?? userId, contributionStatus: input.contributionStatus ?? 'pledged' }
  const online = await checkDatabase().catch(() => false)
  if (online) {
    try {
      await db.insert(contributions).values({
        id: value.id,
        eventId: value.eventId,
        contributorId: value.contributorId,
        contributorName: value.contributorName,
        phoneNumber: value.phoneNumber,
        contributionType: value.contributionType,
        cashAmount: value.cashAmount,
        giftDescription: value.giftDescription,
        giftValue: value.giftValue,
        quantity: value.quantity,
        giftImage: value.giftImage,
        note: value.note,
        contributionStatus: value.contributionStatus,
        date: value.date,
      })
      return toContribution(value)
    } catch {
      // fallback
    }
  }

  const saved = fallbackStore.saveContribution(value)
  return toContribution(saved)
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
      const where = isAdmin
        ? eq(contributions.id, id)
        : and(eq(contributions.id, id), eq(contributions.contributorId, actorId))
      const existing = await db.select({ id: contributions.id }).from(contributions).where(where).limit(1)
      if (existing.length) {
        await db
          .update(contributions)
          .set({
            eventId: input.eventId,
            contributorName: input.contributorName,
            phoneNumber: input.phoneNumber,
            contributionType: input.contributionType,
            cashAmount: input.cashAmount,
            giftDescription: input.giftDescription,
            giftValue: input.giftValue,
            quantity: input.quantity,
            giftImage: input.giftImage,
            note: input.note,
            contributionStatus: input.contributionStatus,
            date: input.date,
          })
          .where(eq(contributions.id, id))
        return toContribution({ ...input, id })
      }
      return null
    } catch {
      // fallback
    }
  }

  const items = fallbackStore.getContributions()
  const target = items.find((c) => c.id === id)
  if (!target) return null
  if (!isAdmin && target.contributorId !== actorId) return null

  const saved = fallbackStore.saveContribution({
    ...target,
    eventId: input.eventId,
    contributorName: input.contributorName,
    phoneNumber: input.phoneNumber,
    contributionType: input.contributionType,
    cashAmount: input.cashAmount,
    giftDescription: input.giftDescription,
    giftValue: input.giftValue,
    quantity: input.quantity,
    giftImage: input.giftImage,
    note: input.note,
    contributionStatus: input.contributionStatus,
    date: input.date,
  })
  return toContribution(saved)
}

export async function deleteContribution(id: string, actorId: string, isAdmin: boolean): Promise<boolean> {
  const online = await checkDatabase().catch(() => false)
  if (online) {
    try {
      const where = isAdmin
        ? eq(contributions.id, id)
        : and(eq(contributions.id, id), eq(contributions.contributorId, actorId))
      const existing = await db.select({ id: contributions.id }).from(contributions).where(where).limit(1)
      if (existing.length) {
        await db.delete(contributions).where(eq(contributions.id, id))
        return true
      }
      return false
    } catch {
      // fallback
    }
  }

  const target = fallbackStore.getContributions().find((c) => c.id === id)
  if (!target) return false
  if (!isAdmin && target.contributorId !== actorId) return false
  fallbackStore.deleteContribution(id)
  return true
}
