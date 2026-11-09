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
  userRole: 'user' | 'planner' | 'admin'
  onAdd: () => void
  onSelect: (contribution: Contribution) => void
  onViewAll: () => void
}

export function DashboardView({ contributions, stats, isReady, userName, userRole, onAdd, onSelect, onViewAll }: DashboardViewProps) {
  const recent = contributions.slice(0, 4)
  const totalCash = stats.receivedCash + stats.promisedCash
  const receivedPercent = totalCash ? Math.round((stats.receivedCash / totalCash) * 100) : 0
  const firstName = userName.trim().split(/\s+/)[0] || 'there'
  const isPlannerOrCouple = userRole === 'planner' || userRole === 'admin'

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-heading">
      <div className="page-heading-row dashboard-heading-row">
        <div>
          <p className="section-kicker">
            {isPlannerOrCouple ? 'BRIDE, GROOM & EVENT PLANNER MONITORING' : 'CONTRIBUTOR REGISTRY'}
            <span className="kicker-sparkle"><Sparkles aria-hidden="true" /></span>
          </p>
          <h1 id="dashboard-heading">Welcome back, <em>{firstName}.</em></h1>
          <p className="page-intro">
            {isPlannerOrCouple
              ? 'Monitoring all guest contributions and installment payments in real-time.'
              : 'Record your promised gifts, cash pledges, and installment payments.'}
          </p>
        </div>
        {!isPlannerOrCouple && (
          <button className="primary-button dashboard-add" type="button" onClick={onAdd}><Plus aria-hidden="true" />Add my contribution</button>
        )}
      </div>

      <article className="event-hero">
        <div className="event-hero-overlay" />
        <div className="event-hero-content">
          <span className="event-label"><Sparkles aria-hidden="true" />{isPlannerOrCouple ? 'COUPLE & EVENT PLANNER HUB' : 'GUEST CONTRIBUTOR PORTAL'}</span>
          <h2>Maya&apos;s Kitchen Party</h2>
          <div className="event-meta">
            <span><CalendarDays aria-hidden="true" />Saturday, 28 November 2026</span>
            <span><MapPin aria-hidden="true" />Lusaka, Zambia</span>
          </div>
          <p className="sample-data-label"><span />{isPlannerOrCouple ? 'Monitoring all guest contributions & gifts' : 'Your gifts & cash installments'}</p>
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
          <span className="stat-caption">Still expected (Installments)</span>
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
          <span className="stat-caption">Promised physical gifts</span>
          <div className="stat-corner-mark">04</div>
        </article>
      </div>

      <div className="dashboard-lower-grid">
        <section className="recent-panel" aria-labelledby="recent-heading">
          <div className="panel-heading">
            <div><p className="panel-eyebrow">THE LATEST KINDNESS</p><h2 id="recent-heading">{isPlannerOrCouple ? 'Guest contributions & installments' : 'My contributions'}</h2></div>
            <button className="subtle-link" type="button" onClick={onViewAll}>See all <ChevronRight aria-hidden="true" /></button>
          </div>
          {recent.length ? <div className="recent-list">{recent.map((item) => <ContributionRow key={item.id} contribution={item} compact onSelect={onSelect} />)}</div> : (
            <div className="dashboard-empty">
              <span className="empty-icon"><Gift aria-hidden="true" /></span>
              <div>
                <strong>Every lovely thing starts somewhere.</strong>
                <p>{isPlannerOrCouple ? 'Waiting for guest contributions and gifts to arrive.' : 'Add your first contribution or installment promise.'}</p>
              </div>
              {!isPlannerOrCouple && <button className="secondary-button" type="button" onClick={onAdd}>Add one <ChevronRight aria-hidden="true" /></button>}
            </div>
          )}
        </section>

        <aside className="progress-card" aria-label="Cash contribution overview">
          <div className="panel-heading progress-heading">
            <div><p className="panel-eyebrow">{isPlannerOrCouple ? 'EVENT MONITORING' : 'MY PLEDGES'}</p><h2>Cash progress</h2></div>
            <span className="progress-icon"><CircleDollarSign aria-hidden="true" /></span>
          </div>
          <div className="cash-progress-wrap">
            <div className="cash-progress" style={{ '--progress': `${receivedPercent}%` } as CSSProperties}>
              <div><strong>{receivedPercent}<small>%</small></strong><span>received</span></div>
            </div>
            <div className="cash-progress-legend">
              <p><span className="legend-swatch received-swatch" />In hand<strong>{formatKwacha(stats.receivedCash)}</strong></p>
              <p><span className="legend-swatch promised-swatch" />Promised / Installments<strong>{formatKwacha(stats.promisedCash)}</strong></p>
            </div>
          </div>
          <div className="progress-footnote"><Flower2 className="footnote-flower" aria-hidden="true" /><span>{isPlannerOrCouple ? 'Monitoring all guest installments and gift promises.' : 'Tracking your partial installment payments.'}</span></div>
        </aside>
      </div>

      <div className="dashboard-footer-note">
        <div className="privacy-seal"><Gift aria-hidden="true" /></div>
        <span>{isPlannerOrCouple ? 'Bride, Groom & Event Planner Monitoring Hub' : 'Your personal contributor account'}</span>
        {!isPlannerOrCouple && <button type="button" onClick={onAdd}>Add installment <ChevronRight aria-hidden="true" /></button>}
      </div>
    </section>
  )
}
