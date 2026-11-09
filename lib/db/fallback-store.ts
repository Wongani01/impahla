import fs from 'node:fs'
import path from 'node:path'

const STORE_PATH = path.join(process.cwd(), '.data', 'store.json')

export type MemoryUser = {
  id: string
  name: string
  email: string
  passwordHash: string
  role: 'user' | 'admin'
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

export type MemorySession = {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
}

export type MemoryContribution = {
  id: string
  userId: string
  name: string
  amount: number
  gift: string
  status: 'promised' | 'received'
  note: string
  date: string
  photo: string | null
  createdAt: string
  updatedAt: string
}

type StoreData = {
  users: MemoryUser[]
  sessions: MemorySession[]
  contributions: MemoryContribution[]
}

function ensureStore(): StoreData {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8')
      return JSON.parse(raw) as StoreData
    }
  } catch (e) {
    console.error('Error reading fallback store', e)
  }
  return { users: [], sessions: [], contributions: [] }
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

  getContributions(userId?: string): MemoryContribution[] {
    const store = ensureStore()
    if (userId) {
      return store.contributions.filter((c) => c.userId === userId)
    }
    return store.contributions
  },
  saveContribution(contribution: Omit<MemoryContribution, 'createdAt' | 'updatedAt'>) {
    const store = ensureStore()
    const now = new Date().toISOString()
    const index = store.contributions.findIndex((c) => c.id === contribution.id)
    const full: MemoryContribution = {
      ...contribution,
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
