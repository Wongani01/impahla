import fs from 'node:fs'
import path from 'node:path'

const STORE_PATH = path.join(process.cwd(), '.data', 'store.json')

export type MemoryUser = {
  id: string
  name: string
  email: string
  passwordHash: string
  role: 'user' | 'planner' | 'admin'
  status: 'active' | 'disabled'
  eventName: string
  eventDate: string
  createdAt: string
  updatedAt: string
}

export type MemorySession = {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
}

export type MemoryEvent = {
  id: string
  plannerId: string
  eventName: string
  description: string
  category: 'kitchen_party' | 'bridal_shower' | 'other'
  hostName: string
  eventDate: string
  eventTime: string
  venue: string
  location: string
  contactInfo: string
  expectedAttendees: number
  coverImage: string | null
  status: 'open' | 'closed' | 'cancelled'
  createdAt: string
}

export type MemoryContribution = {
  id: string
  eventId: string
  contributorId: string | null
  contributorName: string
  phoneNumber: string
  contributionType: 'cash' | 'gift'
  cashAmount: number
  giftDescription: string
  giftValue: number | null
  quantity: number
  giftImage: string | null
  note: string
  contributionStatus:
    | 'pledged'
    | 'paid'
    | 'pending_verification'
    | 'confirmed'
    | 'delivered'
    | 'received'
    | 'cancelled'
  date: string
  createdAt: string
  updatedAt: string
}

type StoreData = {
  users: MemoryUser[]
  sessions: MemorySession[]
  events: MemoryEvent[]
  contributions: MemoryContribution[]
}

/** Pre-v2 contribution rows stored with the old column names. */
type LegacyContribution = Partial<MemoryContribution> & {
  userId?: string | null
  name?: string
  amount?: number
  gift?: string
  status?: string
  photo?: string | null
}

const CONTRIBUTION_STATUSES = new Set<MemoryContribution['contributionStatus']>([
  'pledged',
  'paid',
  'pending_verification',
  'confirmed',
  'delivered',
  'received',
  'cancelled',
])

const LEGACY_STATUS_MAP: Record<string, MemoryContribution['contributionStatus']> = {
  promised: 'pledged',
  received: 'confirmed',
}

/**
 * Upgrades pre-v2 contribution rows to the current shape, mirroring db/schema.sql
 * (amount → cashAmount, gift → giftDescription, promised → pledged, received → confirmed).
 * Rows with no event to attach to cannot be migrated and are skipped.
 */
function migrateContributionRows(rows: LegacyContribution[]): MemoryContribution[] {
  const migrated: MemoryContribution[] = []
  let skipped = 0

  for (const row of rows) {
    if (typeof row.contributorName === 'string' && typeof row.eventId === 'string') {
      migrated.push(row as MemoryContribution)
      continue
    }
    if (!row.id || !row.eventId) {
      skipped += 1
      continue
    }
    const legacyStatus = typeof row.status === 'string' ? LEGACY_STATUS_MAP[row.status] ?? row.status : 'pledged'
    migrated.push({
      id: row.id,
      eventId: row.eventId,
      contributorId: row.contributorId ?? row.userId ?? null,
      contributorName: row.name ?? 'Unknown contributor',
      phoneNumber: row.phoneNumber ?? '',
      contributionType: row.contributionType ?? (row.gift ? 'gift' : 'cash'),
      cashAmount: row.cashAmount ?? row.amount ?? 0,
      giftDescription: row.giftDescription ?? row.gift ?? '',
      giftValue: row.giftValue ?? null,
      quantity: row.quantity ?? 1,
      giftImage: row.giftImage ?? row.photo ?? null,
      note: row.note ?? '',
      contributionStatus: CONTRIBUTION_STATUSES.has(legacyStatus as MemoryContribution['contributionStatus'])
        ? (legacyStatus as MemoryContribution['contributionStatus'])
        : 'pledged',
      date: row.date ?? '',
      createdAt: row.createdAt ?? new Date().toISOString(),
      updatedAt: row.updatedAt ?? new Date().toISOString(),
    })
  }

  if (skipped > 0) {
    console.warn(`[fallback-store] Skipped ${skipped} contribution(s) that could not be migrated (no event to attach to).`)
  }
  return migrated
}

function ensureStore(): StoreData {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8')
      const data = JSON.parse(raw) as StoreData
      if (!data.events) data.events = []
      data.contributions = data.contributions ? migrateContributionRows(data.contributions as LegacyContribution[]) : []
      return data
    }
  } catch (e) {
    console.error('Error reading fallback store', e)
  }
  return { users: [], sessions: [], events: [], contributions: [] }
}

function saveStore(data: StoreData) {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.error('Error saving fallback store', e)
  }
}

export const fallbackStore = {
  getUsers(): MemoryUser[] {
    return ensureStore().users
  },
  saveUser(user: Omit<MemoryUser, 'createdAt' | 'updatedAt'>) {
    const store = ensureStore()
    const now = new Date().toISOString()
    const existingIndex = store.users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase())
    const fullUser: MemoryUser = {
      ...user,
      eventName: user.eventName ?? "Maya's Kitchen Party",
      eventDate: user.eventDate ?? '28 Nov 2026',
      createdAt: existingIndex >= 0 ? store.users[existingIndex].createdAt : now,
      updatedAt: now,
    }
    if (existingIndex >= 0) {
      store.users[existingIndex] = fullUser
    } else {
      store.users.push(fullUser)
    }
    saveStore(store)
    return fullUser
  },
  getUserByEmail(email: string): MemoryUser | undefined {
    const store = ensureStore()
    return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  },
  getUserById(id: string): MemoryUser | undefined {
    const store = ensureStore()
    return store.users.find((u) => u.id === id)
  },
  deleteUser(id: string) {
    const store = ensureStore()
    store.users = store.users.filter((u) => u.id !== id)
    saveStore(store)
  },

  getEvents(): MemoryEvent[] {
    return ensureStore().events
  },
  getEventById(id: string): MemoryEvent | undefined {
    return ensureStore().events.find((e) => e.id === id)
  },
  saveEvent(event: Omit<MemoryEvent, 'createdAt'>) {
    const store = ensureStore()
    const now = new Date().toISOString()
    const index = store.events.findIndex((e) => e.id === event.id)
    const full: MemoryEvent = {
      ...event,
      category: event.category ?? 'kitchen_party',
      status: event.status ?? 'open',
      createdAt: index >= 0 ? store.events[index].createdAt : now,
    }
    if (index >= 0) {
      store.events[index] = full
    } else {
      store.events.push(full)
    }
    saveStore(store)
    return full
  },

  getContributions(contributorId?: string): MemoryContribution[] {
    const store = ensureStore()
    if (contributorId) {
      return store.contributions.filter((c) => c.contributorId === contributorId)
    }
    return store.contributions
  },
  getContributionsByEvent(eventId: string): MemoryContribution[] {
    return ensureStore().contributions.filter((c) => c.eventId === eventId)
  },
  saveContribution(contribution: Omit<MemoryContribution, 'createdAt' | 'updatedAt'>) {
    const store = ensureStore()
    const now = new Date().toISOString()
    const index = store.contributions.findIndex((c) => c.id === contribution.id)
    const full: MemoryContribution = {
      ...contribution,
      contributorId: contribution.contributorId ?? null,
      cashAmount: contribution.cashAmount ?? 0,
      giftDescription: contribution.giftDescription ?? '',
      giftValue: contribution.giftValue ?? null,
      quantity: contribution.quantity ?? 1,
      giftImage: contribution.giftImage ?? null,
      contributionStatus: contribution.contributionStatus ?? 'pledged',
      createdAt: index >= 0 ? store.contributions[index].createdAt : now,
      updatedAt: now,
    }
    if (index >= 0) {
      store.contributions[index] = full
    } else {
      store.contributions.push(full)
    }
    saveStore(store)
    return full
  },
  deleteContribution(id: string) {
    const store = ensureStore()
    store.contributions = store.contributions.filter((c) => c.id !== id)
    saveStore(store)
  },

  getSession(token: string): MemorySession | undefined {
    const store = ensureStore()
    const session = store.sessions.find((s) => s.id === token)
    if (!session) return undefined
    if (new Date(session.expiresAt) < new Date()) {
      store.sessions = store.sessions.filter((s) => s.id !== token)
      saveStore(store)
      return undefined
    }
    return session
  },
  saveSession(session: MemorySession) {
    const store = ensureStore()
    store.sessions = store.sessions.filter((s) => s.id !== session.id)
    store.sessions.push(session)
    saveStore(store)
  },
  deleteSession(token: string) {
    const store = ensureStore()
    store.sessions = store.sessions.filter((s) => s.id !== token)
    saveStore(store)
  },
}
