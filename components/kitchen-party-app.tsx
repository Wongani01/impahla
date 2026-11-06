'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Check, CircleHelp, Flower2, Gift, LayoutDashboard, LoaderCircle, LogOut, Menu, Plus, Search, ShieldCheck, Settings2, WifiOff, X } from 'lucide-react'
import { ContributionDetailsDialog } from '@/components/contribution-details-dialog'
import { ContributionFormDialog } from '@/components/contribution-form-dialog'
import { ContributionListView } from '@/components/contribution-list-view'
import { DashboardView } from '@/components/dashboard-view'
import { useContributions } from '@/hooks/use-contributions'
import type { AuthUser } from '@/lib/auth/session'
import type { Contribution } from '@/lib/contribution-store'

type View = 'overview' | 'contributions'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'ME'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase()
}

export function KitchenPartyApp({ user }: { user: AuthUser }) {
  const router = useRouter()
  const { contributions, isReady, storageError, stats, upsert, remove } = useContributions()
  const [view, setView] = useState<View>('overview')
  const [formOpen, setFormOpen] = useState(false)
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null)
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const currentContribution = useMemo(
    () => selectedContribution ? contributions.find((item) => item.id === selectedContribution.id) ?? null : null,
    [contributions, selectedContribution],
  )

  const openNewForm = () => {
    setEditingContribution(null)
    setFormOpen(true)
    setSidebarOpen(false)
  }

  const openEditForm = (contribution: Contribution) => {
    setSelectedContribution(null)
    setEditingContribution(contribution)
    setFormOpen(true)
  }

  const handleSave = async (contribution: Contribution) => {
    const saved = await upsert(contribution)
    if (saved) setNotice('Contribution saved to your registry.')
    return saved
  }

  const markReceived = async (contribution: Contribution) => {
    const saved = await upsert({ ...contribution, status: 'received' })
    if (saved) setNotice(`${contribution.name}’s contribution marked received.`)
  }

  const handleDelete = async (id: string) => {
    const saved = await remove(id)
    if (saved) {
      setSelectedContribution(null)
      setNotice('Contribution removed from your registry.')
    }
    return saved
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.replace('/')
      router.refresh()
    }
  }

  const navigate = (nextView: View) => {
    setView(nextView)
    setSidebarOpen(false)
  }

  return (
    <>
      <div className="app-shell">
        {sidebarOpen && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
        <aside className={`app-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
          <div className="brand-lockup"><span className="brand-mark"><Gift aria-hidden="true" /></span><span><strong>Impahla app</strong><small>REGISTRY</small></span><button className="icon-button sidebar-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X aria-hidden="true" /></button></div>

          <div className="sidebar-section-label">WORKSPACE</div>
          <nav className="sidebar-nav">
            <button className={`sidebar-nav-item ${view === 'overview' ? 'active' : ''}`} type="button" aria-current={view === 'overview' ? 'page' : undefined} onClick={() => navigate('overview')}><LayoutDashboard aria-hidden="true" /><span>Overview</span></button>
            <button className={`sidebar-nav-item ${view === 'contributions' ? 'active' : ''}`} type="button" aria-current={view === 'contributions' ? 'page' : undefined} onClick={() => navigate('contributions')}><Gift aria-hidden="true" /><span>Contributions</span><span className="nav-count">{contributions.length}</span></button>
            {user.role === 'admin' && (
              <Link className="sidebar-nav-item" href="/admin" onClick={() => setSidebarOpen(false)}><ShieldCheck aria-hidden="true" /><span>Admin console</span></Link>
            )}
          </nav>

          <div className="sidebar-event-card">
            <span className="event-card-label">YOUR ACTIVE EVENT</span>
            <span className="event-card-symbol"><Flower2 aria-hidden="true" /></span>
            <strong>Maya&apos;s<br />Kitchen Party</strong>
            <span className="event-card-date"><CalendarDays aria-hidden="true" />28 Nov 2026</span>
            <span className="event-card-rule" />
            <span className="event-card-location">NDOLA, ZAMBIA</span>
          </div>

          <button className="sidebar-add-button" type="button" onClick={openNewForm}><Plus aria-hidden="true" />Add contribution</button>

          <div className="sidebar-bottom">
            <div className="sidebar-offline-card"><span className="offline-indicator">{storageError ? <WifiOff aria-hidden="true" /> : <Check aria-hidden="true" />}</span><span><strong>{storageError ? 'Sync problem' : 'Saved to your account'}</strong><small>{storageError ? 'Your changes may not be saved' : 'Available on any device'}</small></span><span className="online-dot" aria-label="Synced" /></div>
            <button className="sidebar-help" type="button" onClick={() => setNotice('Your registry is stored securely and is only visible to your account.')}><CircleHelp aria-hidden="true" />Help &amp; privacy</button>
            <div className="organizer-profile"><span className="organizer-avatar">{initialsOf(user.name)}</span><span><strong>{user.name}</strong><small>{user.role === 'admin' ? 'Administrator' : 'Event organiser'}</small></span><button className="icon-button profile-menu" type="button" aria-label="Sign out" disabled={isSigningOut} onClick={handleSignOut}>{isSigningOut ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <LogOut aria-hidden="true" />}</button></div>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu aria-hidden="true" /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{view === 'overview' ? 'Overview' : 'Contributions'}</strong></div>
            <div className="topbar-actions"><span className="topbar-saved">{storageError ? <WifiOff aria-hidden="true" /> : <span className="topbar-check"><Check aria-hidden="true" /></span>}{storageError ? 'Not synced' : isReady ? 'All changes saved' : 'Loading registry'}</span><button className="icon-button topbar-search" type="button" aria-label="Go to contributions" onClick={() => navigate('contributions')}><Search aria-hidden="true" /></button><button className="icon-button topbar-settings" type="button" aria-label="About your account" onClick={() => setNotice(`Signed in as ${user.email}. Your records are private to this account.`)}><Settings2 aria-hidden="true" /></button></div>
          </header>

          {storageError && <div className="storage-alert" role="alert"><WifiOff aria-hidden="true" /><span>{storageError}</span></div>}
          {view === 'overview' ? (
            <DashboardView contributions={contributions} stats={stats} isReady={isReady} userName={user.name} onAdd={openNewForm} onSelect={setSelectedContribution} onViewAll={() => navigate('contributions')} />
          ) : (
            <ContributionListView contributions={contributions} onAdd={openNewForm} onSelect={setSelectedContribution} />
          )}

          <div className="app-bottomline"><span>IMPAHLA APP <span>·</span> YOUR PRIVATE REGISTRY</span><span>One event, held with care.</span></div>
        </main>
      </div>

      {notice && <div className="toast-note" role="status"><span className="toast-check"><Check aria-hidden="true" /></span>{notice}<button type="button" className="icon-button toast-close" onClick={() => setNotice('')} aria-label="Dismiss message"><X aria-hidden="true" /></button></div>}
      <ContributionFormDialog open={formOpen} contribution={editingContribution} onClose={() => setFormOpen(false)} onSave={handleSave} />
      <ContributionDetailsDialog contribution={currentContribution} onClose={() => setSelectedContribution(null)} onEdit={openEditForm} onMarkReceived={markReceived} onDelete={handleDelete} />
    </>
  )
}
