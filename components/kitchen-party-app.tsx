'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Check,
  CircleHelp,
  Compass,
  Flower2,
  Gift,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  WifiOff,
  X,
} from 'lucide-react'
import { ContributionDetailsDialog } from '@/components/contribution-details-dialog'
import { ContributionFormDialog } from '@/components/contribution-form-dialog'
import { ContributionListView } from '@/components/contribution-list-view'
import { ContributeFormView } from '@/components/contribute-form-view'
import { ContributorDiscoverView } from '@/components/contributor-discover-view'
import { ContributorEventDetail } from '@/components/contributor-event-detail'
import { DashboardView } from '@/components/dashboard-view'
import { EventFormView } from '@/components/event-form-view'
import { PlannerEventDetail } from '@/components/planner-event-detail'
import { PlannerEventsView } from '@/components/planner-events-view'
import { useContributions } from '@/hooks/use-contributions'
import { formatEventDate, type EventRecord } from '@/lib/event-store'
import type { Contribution, ContributionType } from '@/lib/contribution-store'
import type { AuthUser } from '@/lib/auth/session'

type View =
  | 'overview'
  | 'contributions'
  | 'events'
  | 'event-detail'
  | 'event-form'
  | 'discover'
  | 'discover-detail'
  | 'contribute-cash'
  | 'contribute-gift'

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
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null)
  const [highlightEvent, setHighlightEvent] = useState<EventRecord | null>(null)

  const isPlannerOrCouple = user.role === 'planner' || user.role === 'admin'

  useEffect(() => {
    const url = isPlannerOrCouple ? '/api/events?mine=1' : '/api/events?open=1'
    fetch(url, { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        const list = (data.events ?? []) as EventRecord[]
        setHighlightEvent(list[0] ?? null)
      })
      .catch(() => {})
  }, [isPlannerOrCouple])

  const notify = (message: string) => setNotice(message)

  const currentContribution = useMemo(
    () => (selectedContribution ? contributions.find((item) => item.id === selectedContribution.id) ?? null : null),
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
    if (saved) notify(isPlannerOrCouple ? 'Contribution updated.' : 'Contribution submitted toward selected event.')
    return saved
  }

  const markContributionReceived = async (contribution: Contribution) => {
    const saved = await upsert({ ...contribution, contributionStatus: 'received' })
    if (saved) notify(`${contribution.contributorName}'s contribution marked received.`)
  }

  const handleDelete = async (id: string) => {
    const saved = await remove(id)
    if (saved) {
      setSelectedContribution(null)
      notify('Contribution removed.')
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

  const openEventDetail = (event: EventRecord) => {
    setActiveEventId(event.id)
    setView(isPlannerOrCouple ? 'event-detail' : 'discover-detail')
    setSidebarOpen(false)
  }

  const openContribute = (type: ContributionType) => {
    setView(type === 'cash' ? 'contribute-cash' : 'contribute-gift')
  }

  const closeEventForm = () => {
    setEditingEvent(null)
    setView(isPlannerOrCouple ? 'events' : 'overview')
  }

  const breadcrumbLabel = (() => {
    switch (view) {
      case 'contributions':
        return isPlannerOrCouple ? 'Guest contributions' : 'My contributions'
      case 'events':
        return 'My events'
      case 'event-detail':
        return 'Event'
      case 'event-form':
        return editingEvent ? 'Edit event' : 'Create event'
      case 'discover':
        return 'Discover events'
      case 'discover-detail':
        return 'Event'
      case 'contribute-cash':
        return 'Contribute cash'
      case 'contribute-gift':
        return 'Contribute gift'
      default:
        return 'Overview'
    }
  })()

  return (
    <>
      <div className="app-shell">
        {sidebarOpen && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
        <aside className={`app-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
          <div className="brand-lockup"><span className="brand-mark"><Gift aria-hidden="true" /></span><span><strong>Impahla app</strong><small>REGISTRY</small></span><button className="icon-button sidebar-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X aria-hidden="true" /></button></div>

          <div className="sidebar-section-label">{isPlannerOrCouple ? 'PLANNER HUB' : 'CONTRIBUTOR PORTAL'}</div>
          <nav className="sidebar-nav">
            <button className={`sidebar-nav-item ${view === 'overview' ? 'active' : ''}`} type="button" aria-current={view === 'overview' ? 'page' : undefined} onClick={() => navigate('overview')}><LayoutDashboard aria-hidden="true" /><span>Overview</span></button>
            {isPlannerOrCouple && (
              <button className={`sidebar-nav-item ${view === 'events' ? 'active' : ''}`} type="button" aria-current={view === 'events' ? 'page' : undefined} onClick={() => navigate('events')}><CalendarDays aria-hidden="true" /><span>My Events</span></button>
            )}
            {!isPlannerOrCouple && (
              <button className={`sidebar-nav-item ${view === 'discover' ? 'active' : ''}`} type="button" aria-current={view === 'discover' ? 'page' : undefined} onClick={() => navigate('discover')}><Compass aria-hidden="true" /><span>Discover Events</span></button>
            )}
            <button className={`sidebar-nav-item ${view === 'contributions' ? 'active' : ''}`} type="button" aria-current={view === 'contributions' ? 'page' : undefined} onClick={() => navigate('contributions')}><Gift aria-hidden="true" /><span>{isPlannerOrCouple ? 'Guest Contributions' : 'My Contributions'}</span><span className="nav-count">{contributions.length}</span></button>
            {user.role === 'admin' && (
              <Link className="sidebar-nav-item" href="/admin" onClick={() => setSidebarOpen(false)}><ShieldCheck aria-hidden="true" /><span>Admin console</span></Link>
            )}
          </nav>

          <div className="sidebar-event-card">
            <span className="event-card-label">{isPlannerOrCouple ? 'LATEST EVENT' : 'OPEN FOR CONTRIBUTIONS'}</span>
            <span className="event-card-symbol"><Flower2 aria-hidden="true" /></span>
            <strong>{highlightEvent ? highlightEvent.eventName : isPlannerOrCouple ? 'No events yet' : 'Find an event'}</strong>
            {highlightEvent ? (
              <>
                <span className="event-card-date"><CalendarDays aria-hidden="true" />{formatEventDate(highlightEvent.eventDate)}</span>
                <span className="event-card-rule" />
                <span className="event-card-location">{highlightEvent.location.toUpperCase()}</span>
              </>
            ) : (
              <>
                <span className="event-card-rule" />
                <span className="event-card-location">{isPlannerOrCouple ? 'CREATE YOUR FIRST EVENT' : 'BROWSE OPEN EVENTS'}</span>
              </>
            )}
          </div>

          {isPlannerOrCouple ? (
            <button className="sidebar-add-button" type="button" onClick={() => { setEditingEvent(null); setView('event-form'); setSidebarOpen(false) }}><Plus aria-hidden="true" />Create event</button>
          ) : (
            <button className="sidebar-add-button" type="button" onClick={() => navigate('discover')}><Compass aria-hidden="true" />Discover events</button>
          )}

          <div className="sidebar-bottom">
            <div className="sidebar-offline-card"><span className="offline-indicator">{storageError ? <WifiOff aria-hidden="true" /> : <Check aria-hidden="true" />}</span><span><strong>{storageError ? 'Sync problem' : 'Saved to your account'}</strong><small>{storageError ? 'Your changes may not be saved' : 'Available on any device'}</small></span><span className="online-dot" aria-label="Synced" /></div>
            <button className="sidebar-help" type="button" onClick={() => setNotice(isPlannerOrCouple ? 'Create events and track guest contributions from one place.' : 'Discover an open event, then record your cash or gift contribution.')}><CircleHelp aria-hidden="true" />Help &amp; privacy</button>
            <div className="organizer-profile"><span className="organizer-avatar">{initialsOf(user.name)}</span><span><strong>{user.name}</strong><small>{user.role === 'planner' ? 'Bride, Groom & Planner' : user.role === 'admin' ? 'Administrator' : 'Contributor'}</small></span><button className="icon-button profile-menu" type="button" aria-label="Sign out" disabled={isSigningOut} onClick={handleSignOut}>{isSigningOut ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <LogOut aria-hidden="true" />}</button></div>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu aria-hidden="true" /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{breadcrumbLabel}</strong></div>
            <div className="topbar-actions"><span className="topbar-saved">{storageError ? <WifiOff aria-hidden="true" /> : <span className="topbar-check"><Check aria-hidden="true" /></span>}{storageError ? 'Not synced' : isReady ? 'All changes saved' : 'Loading registry'}</span><button className="icon-button topbar-search" type="button" aria-label="Go to contributions" onClick={() => navigate('contributions')}><Search aria-hidden="true" /></button><button className="icon-button topbar-settings" type="button" aria-label="About your account" onClick={() => setNotice(`Signed in as ${user.email}. Role: ${user.role}.`)}><Settings2 aria-hidden="true" /></button></div>
          </header>

          {storageError && <div className="storage-alert" role="alert"><WifiOff aria-hidden="true" /><span>{storageError}</span></div>}

          {view === 'overview' && (
            <DashboardView contributions={contributions} stats={stats} isReady={isReady} userName={user.name} userRole={user.role} event={highlightEvent} onAdd={openNewForm} onSelect={setSelectedContribution} onViewAll={() => navigate('contributions')} />
          )}

          {view === 'contributions' && (
            <ContributionListView contributions={contributions} onAdd={isPlannerOrCouple ? undefined : openNewForm} onSelect={setSelectedContribution} />
          )}

          {view === 'events' && (
            <PlannerEventsView
              onCreate={() => { setEditingEvent(null); setView('event-form') }}
              onOpen={openEventDetail}
            />
          )}

          {view === 'event-form' && (
            <EventFormView
              event={editingEvent}
              notify={notify}
              onCancel={closeEventForm}
              onSaved={(saved) => {
                setEditingEvent(null)
                setActiveEventId(saved.id)
                setView('event-detail')
              }}
            />
          )}

          {view === 'event-detail' && activeEventId && (
            <PlannerEventDetail
              eventId={activeEventId}
              notify={notify}
              onBack={() => setView('events')}
              onEdit={(event) => { setEditingEvent(event); setView('event-form') }}
            />
          )}

          {view === 'discover' && <ContributorDiscoverView onOpen={openEventDetail} />}

          {view === 'discover-detail' && activeEventId && (
            <ContributorEventDetail
              eventId={activeEventId}
              onBack={() => setView('discover')}
              onContribute={openContribute}
            />
          )}

          {(view === 'contribute-cash' || view === 'contribute-gift') && activeEventId && (
            <ContributeFormView
              eventId={activeEventId}
              type={view === 'contribute-cash' ? 'cash' : 'gift'}
              notify={notify}
              onCancel={() => setView('discover-detail')}
              onDone={() => setView('discover-detail')}
            />
          )}

          <div className="app-bottomline"><span>IMPAHLA APP <span>·</span> {isPlannerOrCouple ? 'EVENT PLANNER & COUPLE MONITORING HUB' : 'CONTRIBUTOR GUEST PORTAL'}</span><span>One event, held with care.</span></div>
        </main>
      </div>

      {notice && <div className="toast-note" role="status"><span className="toast-check"><Check aria-hidden="true" /></span>{notice}<button type="button" className="icon-button toast-close" onClick={() => setNotice('')} aria-label="Dismiss message"><X aria-hidden="true" /></button></div>}
      <ContributionFormDialog open={formOpen} contribution={editingContribution} onClose={() => setFormOpen(false)} onSave={handleSave} />
      <ContributionDetailsDialog contribution={currentContribution} onClose={() => setSelectedContribution(null)} onEdit={openEditForm} onMarkReceived={markContributionReceived} onDelete={handleDelete} />
    </>
  )
}
