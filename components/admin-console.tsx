'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BadgeCheck,
  BarChart3,
  Check,
  CircleDollarSign,
  FileText,
  Gift,
  HeartHandshake,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Package,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  UserRoundPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { ContributionDetailsDialog } from '@/components/contribution-details-dialog'
import { ContributionFormDialog } from '@/components/contribution-form-dialog'
import { contributionStatusLabel, formatContributionDate, formatKwacha, isCashInHand, type AdminContribution, type Contribution } from '@/lib/contribution-store'
import type { AuthUser } from '@/lib/auth/session'

type Section = 'analytics' | 'contributions' | 'users' | 'content'

type AdminUserRow = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  status: 'active' | 'disabled'
  createdAt: string
  contributionCount: number
}

type PlatformStats = {
  totalUsers: number
  activeUsers: number
  disabledUsers: number
  adminUsers: number
  totalContributions: number
  receivedTotal: number
  promisedTotal: number
}

type ContentRow = {
  id: number
  slug: string
  title: string
  body: string
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '??'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase()
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong.')
  return data
}

export function AdminConsole({ user }: { user: AuthUser }) {
  const router = useRouter()
  const [section, setSection] = useState<Section>('analytics')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [contributions, setContributions] = useState<AdminContribution[]>([])
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [content, setContent] = useState<ContentRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [selectedContribution, setSelectedContribution] = useState<AdminContribution | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingContribution, setEditingContribution] = useState<AdminContribution | null>(null)
  const [busyId, setBusyId] = useState('')

  const loadSection = useCallback(async (target: Section) => {
    setIsLoading(true)
    setLoadError('')
    try {
      if (target === 'analytics') {
        const data = await readJson(await fetch('/api/admin/stats', { cache: 'no-store' }))
        setStats(data.stats as PlatformStats)
      } else if (target === 'contributions') {
        const data = await readJson(await fetch('/api/contributions?scope=all', { cache: 'no-store' }))
        setContributions((data.contributions ?? []) as AdminContribution[])
      } else if (target === 'users') {
        const data = await readJson(await fetch('/api/admin/users', { cache: 'no-store' }))
        setUsers((data.users ?? []) as AdminUserRow[])
      } else {
        const data = await readJson(await fetch('/api/admin/content', { cache: 'no-store' }))
        setContent((data.content ?? []) as ContentRow[])
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load this section.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSection(section)
  }, [section, loadSection])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.replace('/')
      router.refresh()
    }
  }

  const go = (target: Section) => {
    setSection(target)
    setSidebarOpen(false)
  }

  const saveContribution = async (contribution: AdminContribution) => {
    try {
      const data = await readJson(
        await fetch(`/api/contributions/${contribution.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contribution),
        }),
      )
      const saved = data.contribution as AdminContribution
      setContributions((current) =>
        current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)),
      )
      setNotice('Contribution updated.')
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update this contribution.')
      return false
    }
  }

  const markReceived = async (contribution: Contribution) => {
    const saved = await saveContribution({ ...(contribution as AdminContribution), contributionStatus: 'received' })
    if (saved) setSelectedContribution(null)
  }

  const deleteContribution = async (id: string) => {
    setBusyId(id)
    try {
      await readJson(await fetch(`/api/contributions/${id}`, { method: 'DELETE' }))
      setContributions((current) => current.filter((item) => item.id !== id))
      setSelectedContribution(null)
      setNotice('Contribution removed.')
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not remove this contribution.')
      return false
    } finally {
      setBusyId('')
    }
  }

  const updateUser = async (id: string, patch: { role?: 'user' | 'admin'; status?: 'active' | 'disabled' }) => {
    setBusyId(id)
    try {
      await readJson(
        await fetch(`/api/admin/users/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }),
      )
      setUsers((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
      setNotice('User account updated.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update this user.')
    } finally {
      setBusyId('')
    }
  }

  const deleteUser = async (row: AdminUserRow) => {
    setBusyId(row.id)
    try {
      await readJson(await fetch(`/api/admin/users/${row.id}`, { method: 'DELETE' }))
      setUsers((current) => current.filter((item) => item.id !== row.id))
      setNotice(`${row.name}’s account was removed.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete this user.')
    } finally {
      setBusyId('')
    }
  }

  const saveContent = async (row: ContentRow) => {
    setBusyId(row.slug)
    try {
      await readJson(
        await fetch('/api/admin/content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: row.slug, title: row.title, body: row.body }),
        }),
      )
      setNotice(`“${row.slug}” saved.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save this content.')
    } finally {
      setBusyId('')
    }
  }

  const currentContribution = selectedContribution
    ? contributions.find((item) => item.id === selectedContribution.id) ?? null
    : null

  const sectionLabels: Record<Section, string> = {
    analytics: 'Platform analytics',
    contributions: 'All contributions',
    users: 'User accounts',
    content: 'Site content',
  }

  return (
    <>
      <div className="app-shell admin-shell">
        {sidebarOpen && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
        <aside className={`app-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-label="Admin navigation">
          <div className="brand-lockup"><span className="brand-mark"><ShieldCheck aria-hidden="true" /></span><span><strong>Impahla app</strong><small>ADMIN CONSOLE</small></span><button className="icon-button sidebar-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X aria-hidden="true" /></button></div>

          <div className="sidebar-section-label">MANAGE</div>
          <nav className="sidebar-nav">
            <button className={`sidebar-nav-item ${section === 'analytics' ? 'active' : ''}`} type="button" aria-current={section === 'analytics' ? 'page' : undefined} onClick={() => go('analytics')}><BarChart3 aria-hidden="true" /><span>Analytics</span></button>
            <button className={`sidebar-nav-item ${section === 'contributions' ? 'active' : ''}`} type="button" aria-current={section === 'contributions' ? 'page' : undefined} onClick={() => go('contributions')}><Gift aria-hidden="true" /><span>Contributions</span>{contributions.length > 0 && <span className="nav-count">{contributions.length}</span>}</button>
            <button className={`sidebar-nav-item ${section === 'users' ? 'active' : ''}`} type="button" aria-current={section === 'users' ? 'page' : undefined} onClick={() => go('users')}><UsersRound aria-hidden="true" /><span>Users</span></button>
            <button className={`sidebar-nav-item ${section === 'content' ? 'active' : ''}`} type="button" aria-current={section === 'content' ? 'page' : undefined} onClick={() => go('content')}><FileText aria-hidden="true" /><span>Site content</span></button>
          </nav>

          <div className="sidebar-section-label admin-nav-gap">SWITCH</div>
          <nav className="sidebar-nav">
            <Link className="sidebar-nav-item" href="/dashboard" onClick={() => setSidebarOpen(false)}><LayoutDashboard aria-hidden="true" /><span>My registry</span></Link>
          </nav>

          <div className="sidebar-bottom">
            <button className="sidebar-help" type="button" onClick={() => setNotice('Administrator actions apply across every account and registry on the platform.')}><Shield aria-hidden="true" />You are signed in as an administrator</button>
            <div className="organizer-profile"><span className="organizer-avatar">{initialsOf(user.name)}</span><span><strong>{user.name}</strong><small>Administrator</small></span><button className="icon-button profile-menu" type="button" aria-label="Sign out" disabled={isSigningOut} onClick={handleSignOut}>{isSigningOut ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <LogOut aria-hidden="true" />}</button></div>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu aria-hidden="true" /></button>
            <div className="breadcrumb"><span>Admin</span><span className="breadcrumb-slash">/</span><strong>{sectionLabels[section]}</strong></div>
            <div className="topbar-actions"><span className="topbar-saved"><span className="topbar-check"><ShieldCheck aria-hidden="true" /></span>Administrator access</span><button className="icon-button topbar-settings" type="button" aria-label="Refresh" onClick={() => void loadSection(section)} disabled={isLoading}>{isLoading ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <Package aria-hidden="true" />}</button></div>
          </header>

          {loadError && <div className="storage-alert" role="alert"><X aria-hidden="true" /><span>{loadError}</span></div>}

          <section className="dashboard-page admin-page" aria-live="polite">
            {section === 'analytics' && <AnalyticsPanel stats={stats} isLoading={isLoading} />}
            {section === 'contributions' && (
              <ContributionsPanel
                contributions={contributions}
                isLoading={isLoading}
                busyId={busyId}
                onSelect={setSelectedContribution}
                onAdd={() => { setEditingContribution(null); setFormOpen(true) }}
                onMarkReceived={markReceived}
                onDelete={deleteContribution}
              />
            )}
            {section === 'users' && (
              <UsersPanel users={users} currentUserId={user.id} isLoading={isLoading} busyId={busyId} onUpdate={updateUser} onDelete={deleteUser} />
            )}
            {section === 'content' && (
              <ContentPanel content={content} isLoading={isLoading} busyId={busyId} onChange={setContent} onSave={saveContent} />
            )}
          </section>

          <div className="app-bottomline"><span>IMPAHLA APP <span>·</span> ADMIN CONSOLE</span><span>Platform oversight, handled with care.</span></div>
        </main>
      </div>

      {notice && <div className="toast-note" role="status"><span className="toast-check"><Check aria-hidden="true" /></span>{notice}<button type="button" className="icon-button toast-close" onClick={() => setNotice('')} aria-label="Dismiss message"><X aria-hidden="true" /></button></div>}
      <ContributionDetailsDialog contribution={currentContribution} onClose={() => setSelectedContribution(null)} onEdit={(contribution) => { setSelectedContribution(null); setEditingContribution(contribution as AdminContribution); setFormOpen(true) }} onMarkReceived={markReceived} onDelete={deleteContribution} />
      <ContributionFormDialog open={formOpen} contribution={editingContribution} onClose={() => setFormOpen(false)} onSave={saveContribution as (contribution: import('@/lib/contribution-store').Contribution) => Promise<boolean>} />
    </>
  )
}

function AnalyticsPanel({ stats, isLoading }: { stats: PlatformStats | null; isLoading: boolean }) {
  const cards = [
    { key: 'users', label: 'TOTAL USERS', value: stats?.totalUsers, icon: UsersRound, caption: `${stats?.activeUsers ?? 0} active · ${stats?.disabledUsers ?? 0} disabled`, className: 'stat-contributors' },
    { key: 'admins', label: 'ADMINISTRATORS', value: stats?.adminUsers, icon: ShieldCheck, caption: 'Full platform access', className: 'stat-gifts' },
    { key: 'contributions', label: 'CONTRIBUTIONS', value: stats?.totalContributions, icon: Gift, caption: 'Across every registry', className: 'stat-promised' },
    { key: 'received', label: 'CASH RECEIVED', value: stats ? formatKwacha(stats.receivedTotal) : undefined, icon: CircleDollarSign, caption: 'Marked as received', className: 'stat-received' },
    { key: 'promised', label: 'CASH PROMISED', value: stats ? formatKwacha(stats.promisedTotal) : undefined, icon: HeartHandshake, caption: 'Still expected', className: 'stat-promised' },
    { key: 'total', label: 'TOTAL PIPELINE', value: stats ? formatKwacha(stats.receivedTotal + stats.promisedTotal) : undefined, icon: BadgeCheck, caption: 'Received + promised', className: 'stat-contributors' },
  ]

  return (
    <>
      <div className="page-heading-row">
        <div><p className="section-kicker">PLATFORM-WIDE ANALYTICS</p><h1>The whole picture</h1><p className="page-intro">A live view of every account and every contribution on Impahla app.</p></div>
      </div>
      <div className="stats-grid admin-stats-grid">
        {cards.map(({ key, label, value, icon: Icon, caption, className }) => (
          <article className={`stat-card ${className}`} key={key}>
            <div className="stat-card-top"><span className="stat-icon"><Icon aria-hidden="true" /></span><span className="stat-overline">{label}</span></div>
            <strong className="stat-value">{isLoading && value === undefined ? '—' : value ?? '—'}</strong>
            <span className="stat-caption">{caption}</span>
          </article>
        ))}
      </div>
    </>
  )
}

function ContributionsPanel({
  contributions,
  isLoading,
  busyId,
  onSelect,
  onAdd,
  onMarkReceived,
  onDelete,
}: {
  contributions: AdminContribution[]
  isLoading: boolean
  busyId: string
  onSelect: (contribution: AdminContribution) => void
  onAdd: () => void
  onMarkReceived: (contribution: AdminContribution) => void
  onDelete: (id: string) => void
}) {
  return (
    <>
      <div className="page-heading-row">
        <div><p className="section-kicker">MANAGE ALL CONTRIBUTIONS</p><h1>Every contribution</h1><p className="page-intro">Review, correct or remove records from any registry.</p></div>
        <button className="primary-button" type="button" onClick={onAdd}><Gift aria-hidden="true" />Add contribution</button>
      </div>

      <div className="list-panel">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr><th>Contributor</th><th>Registry owner</th><th>Gift</th><th>Date</th><th>Amount</th><th>Status</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {contributions.map((item) => {
                const isGift = item.contributionType === 'gift'
                const canMarkReceived = !isCashInHand(item.contributionStatus) && item.contributionStatus !== 'cancelled'
                return (
                  <tr key={item.id}>
                    <td><button className="admin-cell-button" type="button" onClick={() => onSelect(item)}>{item.contributorName}</button></td>
                    <td><span className="admin-owner">{item.ownerName}<small>{item.ownerEmail}</small></span></td>
                    <td className="admin-muted">{isGift ? item.giftDescription || '—' : 'Cash'}</td>
                    <td className="admin-muted">{formatContributionDate(item.date)}</td>
                    <td className="admin-amount">{isGift ? (item.giftValue ? formatKwacha(item.giftValue) : '—') : formatKwacha(item.cashAmount)}</td>
                    <td><span className={`status-pill ${item.contributionStatus}`}><span className="status-dot" />{contributionStatusLabel(item.contributionStatus)}</span></td>
                    <td>
                      <div className="admin-row-actions">
                        {canMarkReceived && <button className="icon-button" type="button" title="Mark received" aria-label="Mark received" disabled={busyId === item.id} onClick={() => onMarkReceived(item)}>{busyId === item.id ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <Check aria-hidden="true" />}</button>}
                        <button className="icon-button danger-icon" type="button" title="Delete" aria-label="Delete contribution" disabled={busyId === item.id} onClick={() => onDelete(item.id)}><Trash2 aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && !contributions.length && <div className="admin-empty"><Gift aria-hidden="true" /><strong>No contributions yet</strong><p>Records added by any account will appear here.</p></div>}
        {isLoading && !contributions.length && <div className="admin-empty"><LoaderCircle className="button-spinner" aria-hidden="true" /><p>Loading contributions…</p></div>}
      </div>
    </>
  )
}

function UsersPanel({
  users,
  currentUserId,
  isLoading,
  busyId,
  onUpdate,
  onDelete,
}: {
  users: AdminUserRow[]
  currentUserId: string
  isLoading: boolean
  busyId: string
  onUpdate: (id: string, patch: { role?: 'user' | 'admin'; status?: 'active' | 'disabled' }) => void
  onDelete: (row: AdminUserRow) => void
}) {
  return (
    <>
      <div className="page-heading-row">
        <div><p className="section-kicker">MANAGE USER ACCOUNTS</p><h1>People on Impahla app</h1><p className="page-intro">Promote administrators, disable access, or remove accounts.</p></div>
      </div>

      <div className="list-panel">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Records</th><th>Role</th><th>Status</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {users.map((row) => {
                const isSelf = row.id === currentUserId
                return (
                  <tr key={row.id} className={row.status === 'disabled' ? 'admin-row-disabled' : undefined}>
                    <td>
                      <span className="admin-user-cell"><span className="organizer-avatar small">{initialsOf(row.name)}</span><span>{row.name}{isSelf && <small className="admin-you">You</small>}</span></span>
                    </td>
                    <td className="admin-muted">{row.email}</td>
                    <td className="admin-muted">{row.contributionCount}</td>
                    <td><span className={`status-pill ${row.role === 'admin' ? 'received' : 'promised'}`}>{row.role === 'admin' ? 'Administrator' : 'User'}</span></td>
                    <td><span className={`status-pill ${row.status === 'active' ? 'received' : 'promised'}`}>{row.status === 'active' ? 'Active' : 'Disabled'}</span></td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="icon-button" type="button" title={row.role === 'admin' ? 'Make user' : 'Make administrator'} aria-label="Change role" disabled={isSelf || busyId === row.id} onClick={() => onUpdate(row.id, { role: row.role === 'admin' ? 'user' : 'admin' })}><UserCog aria-hidden="true" /></button>
                        <button className="icon-button" type="button" title={row.status === 'active' ? 'Disable account' : 'Enable account'} aria-label="Change status" disabled={isSelf || busyId === row.id} onClick={() => onUpdate(row.id, { status: row.status === 'active' ? 'disabled' : 'active' })}>{row.status === 'active' ? <X aria-hidden="true" /> : <Check aria-hidden="true" />}</button>
                        <button className="icon-button danger-icon" type="button" title="Delete account" aria-label="Delete account" disabled={isSelf || busyId === row.id} onClick={() => onDelete(row)}><Trash2 aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && !users.length && <div className="admin-empty"><UserRoundPlus aria-hidden="true" /><strong>No accounts yet</strong><p>New sign-ups will appear here.</p></div>}
        {isLoading && !users.length && <div className="admin-empty"><LoaderCircle className="button-spinner" aria-hidden="true" /><p>Loading accounts…</p></div>}
      </div>
    </>
  )
}

function ContentPanel({
  content,
  isLoading,
  busyId,
  onChange,
  onSave,
}: {
  content: ContentRow[]
  isLoading: boolean
  busyId: string
  onChange: (next: ContentRow[]) => void
  onSave: (row: ContentRow) => void
}) {
  const updateField = (slug: string, field: 'title' | 'body', value: string) => {
    onChange(content.map((row) => (row.slug === slug ? { ...row, [field]: value } : row)))
  }

  return (
    <>
      <div className="page-heading-row">
        <div><p className="section-kicker">MANAGE SITE CONTENT</p><h1>Words on your platform</h1><p className="page-intro">Edit the copy shown across Impahla app. Saving updates it for everyone.</p></div>
      </div>

      <div className="admin-content-grid">
        {content.map((row) => (
          <article className="admin-content-card" key={row.slug}>
            <header><span className="admin-content-slug">{row.slug}</span>{row.id === 0 && <span className="admin-content-new">NEW</span>}</header>
            <label className="form-field">
              <span>Title</span>
              <input value={row.title} onChange={(event) => updateField(row.slug, 'title', event.target.value)} maxLength={160} />
            </label>
            <label className="form-field">
              <span>Body</span>
              <textarea value={row.body} onChange={(event) => updateField(row.slug, 'body', event.target.value)} rows={4} />
            </label>
            <button className="primary-button admin-save" type="button" disabled={busyId === row.slug} onClick={() => onSave(row)}>
              {busyId === row.slug ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <Save aria-hidden="true" />}Save
            </button>
          </article>
        ))}
      </div>
      {!isLoading && !content.length && <div className="admin-empty"><FileText aria-hidden="true" /><strong>No content blocks</strong><p>Import the seed SQL to create starter content.</p></div>}
      {isLoading && !content.length && <div className="admin-empty"><LoaderCircle className="button-spinner" aria-hidden="true" /><p>Loading content…</p></div>}
    </>
  )
}
