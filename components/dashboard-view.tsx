'use client'

import type { CSSProperties } from 'react'
import { CalendarDays, ChevronRight, CircleDollarSign, Flower2, Gift, HeartHandshake, MapPin, PackageCheck, Plus, Sparkles, UsersRound } from 'lucide-react'
import { ContributionRow } from '@/components/contribution-row'
import { formatKwacha, type Contribution } from '@/lib/contribution-store'

type DashboardViewProps = {
  contributions: Contribution[]
  stats: { receivedCash: number; promisedCash: number; contributorCount: number; outstandingGifts: number }
  isReady: boolean
  userName: string
  onAdd: () => void
  onSelect: (contribution: Contribution) => void
  onViewAll: () => void
}

export function DashboardView({ contributions, stats, isReady, userName, onAdd, onSelect, onViewAll }: DashboardViewProps) {
  const recent = contributions.slice(0, 4)
  const totalCash = stats.receivedCash + stats.promisedCash
  const receivedPercent = totalCash ? Math.round((stats.receivedCash / totalCash) * 100) : 0
  const firstName = userName.trim().split(/\s+/)[0] || 'there'

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-heading">
      <div className="page-heading-row dashboard-heading-row">
        <div><p className="section-kicker">YOUR KITCHEN PARTY REGISTRY <span className="kicker-sparkle"><Sparkles aria-hidden="true" /></span></p><h1>Welcome back, <em>{firstName}.</em></h1><p className="page-intro">Your celebration is coming together, one generous heart at a time.</p></div>
        <button className="primary-button dashboard-add" type="button" onClick={onAdd}><Plus aria-hidden="true" />Add contribution</button>
      </div>

      <article className="event-hero">
        <div className="event-hero-overlay" />
        <div className="event-hero-content">
          <span className="event-label"><Sparkles aria-hidden="true" />YOUR CELEBRATION</span>
          <h2>Maya&apos;s Kitchen Party</h2>
          <div className="event-meta"><span><CalendarDays aria-hidden="true" />Saturday, 28 November 2026</span><span><MapPin aria-hidden="true" />Lusaka, Zambia</span></div>
          <p className="sample-data-label"><span />Kept privately for your account</p>
        </div>
        <div className="hero-note"><Flower2 className="hero-note-flower" aria-hidden="true" /><span>Made warmer<br />by all of you</span></div>
      </article>

      <div className="stats-grid" aria-label="Contribution summary">
        <article className="stat-card stat-received">
          <div className="stat-card-top"><span className="stat-icon"><CircleDollarSign aria-hidden="true" /></span><span className="stat-overline">CASH RECEIVED</span></div>
          <strong className="stat-value">{isReady ? formatKwacha(stats.receivedCash) : '—'}</strong>
          <span className="stat-caption">Already in hand</span>
          <div className="stat-corner-mark">01</div>
        </article>
        <article className="stat-card stat-promised">
          <div className="stat-card-top"><span className="stat-icon"><HeartHandshake aria-hidden="true" /></span><span className="stat-overline">CASH PROMISED</span></div>
          <strong className="stat-value">{isReady ? formatKwacha(stats.promisedCash) : '—'}</strong>
          <span className="stat-caption">Still expected</span>
          <div className="stat-corner-mark">02</div>
        </article>
        <article className="stat-card stat-contributors">
          <div className="stat-card-top"><span className="stat-icon"><UsersRound aria-hidden="true" /></span><span className="stat-overline">CONTRIBUTORS</span></div>
          <strong className="stat-value">{isReady ? String(stats.contributorCount).padStart(2, '0') : '—'}</strong>
          <span className="stat-caption">Generous people</span>
          <div className="stat-corner-mark">03</div>
        </article>
        <article className="stat-card stat-gifts">
          <div className="stat-card-top"><span className="stat-icon"><PackageCheck aria-hidden="true" /></span><span className="stat-overline">GIFTS TO COME</span></div>
          <strong className="stat-value">{isReady ? String(stats.outstandingGifts).padStart(2, '0') : '—'}</strong>
          <span className="stat-caption">Promised, not yet received</span>
          <div className="stat-corner-mark">04</div>
        </article>
      </div>

      <div className="dashboard-lower-grid">
        <section className="recent-panel" aria-labelledby="recent-heading">
          <div className="panel-heading">
            <div><p className="panel-eyebrow">THE LATEST KINDNESS</p><h2 id="recent-heading">Recent contributions</h2></div>
            <button className="subtle-link" type="button" onClick={onViewAll}>See all <ChevronRight aria-hidden="true" /></button>
          </div>
          {recent.length ? <div className="recent-list">{recent.map((item) => <ContributionRow key={item.id} contribution={item} compact onSelect={onSelect} />)}</div> : (
            <div className="dashboard-empty"><span className="empty-icon"><Gift aria-hidden="true" /></span><div><strong>Every lovely thing starts somewhere.</strong><p>Add the first gift or promise to your registry.</p></div><button className="secondary-button" type="button" onClick={onAdd}>Add one <ChevronRight aria-hidden="true" /></button></div>
          )}
        </section>

        <aside className="progress-card" aria-label="Cash contribution overview">
          <div className="panel-heading progress-heading"><div><p className="panel-eyebrow">A GENTLE CHECK-IN</p><h2>Cash so far</h2></div><span className="progress-icon"><CircleDollarSign aria-hidden="true" /></span></div>
          <div className="cash-progress-wrap">
            <div className="cash-progress" style={{ '--progress': `${receivedPercent}%` } as CSSProperties}><div><strong>{receivedPercent}<small>%</small></strong><span>received</span></div></div>
            <div className="cash-progress-legend"><p><span className="legend-swatch received-swatch" />In hand<strong>{formatKwacha(stats.receivedCash)}</strong></p><p><span className="legend-swatch promised-swatch" />On its way<strong>{formatKwacha(stats.promisedCash)}</strong></p></div>
          </div>
          <div className="progress-footnote"><Flower2 className="footnote-flower" aria-hidden="true" /><span>Every contribution helps make the day feel like hers.</span></div>
        </aside>
      </div>

      <div className="dashboard-footer-note"><div className="privacy-seal"><Gift aria-hidden="true" /></div><span>Your registry is private to your account.</span><button type="button" onClick={onAdd}>Add a note <ChevronRight aria-hidden="true" /></button></div>
    </section>
  )
}
