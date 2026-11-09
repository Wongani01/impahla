'use client'

import { useMemo, useState } from 'react'
import { ArrowDownToLine, Search, SlidersHorizontal, UsersRound } from 'lucide-react'
import { ContributionRow } from '@/components/contribution-row'
import {
  contributionStatusLabel,
  formatKwacha,
  isCashInHand,
  type Contribution,
  type ContributionStatus,
} from '@/lib/contribution-store'

type Filter = 'all' | ContributionStatus

type ContributionListViewProps = {
  contributions: Contribution[]
  onAdd?: () => void
  onSelect: (contribution: Contribution) => void
}

export function ContributionListView({ contributions, onAdd, onSelect }: ContributionListViewProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return contributions.filter((item) => {
      const matchesFilter = filter === 'all' || item.contributionStatus === filter
      const matchesQuery =
        !normalizedQuery ||
        [item.contributorName, item.giftDescription, item.note].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery),
        )
      return matchesFilter && matchesQuery
    })
  }, [contributions, filter, query])

  const downloadCsv = () => {
    const rows = [
      ['Contributor', 'Type', 'Cash (ZMW)', 'Gift / contribution', 'Qty', 'Status', 'Date noted', 'Note'],
      ...filtered.map((item) => [
        item.contributorName,
        item.contributionType,
        String(item.cashAmount),
        item.giftDescription,
        String(item.quantity),
        contributionStatusLabel(item.contributionStatus),
        item.date,
        item.note,
      ]),
    ]
    const escapeCsvCell = (cell: string) => {
      const safeCell = /^\s*[-=+@]/.test(cell) ? `'${cell}` : cell
      return `"${safeCell.replaceAll('"', '""')}"`
    }
    const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'impahla-app-contributions.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All entries', count: contributions.length },
    { id: 'pledged', label: 'Pledged', count: contributions.filter((item) => item.contributionStatus === 'pledged').length },
    { id: 'paid', label: 'Paid', count: contributions.filter((item) => item.contributionStatus === 'paid').length },
    { id: 'received', label: 'Received', count: contributions.filter((item) => item.contributionStatus === 'received').length },
    { id: 'cancelled', label: 'Cancelled', count: contributions.filter((item) => item.contributionStatus === 'cancelled').length },
  ]

  const cashReceived = contributions
    .filter((item) => item.contributionType === 'cash' && isCashInHand(item.contributionStatus))
    .reduce((sum, item) => sum + item.cashAmount, 0)

  return (
    <section className="contributions-page" aria-labelledby="contributions-heading">
      <div className="page-heading-row">
        <div>
          <p className="section-kicker">YOUR EVENT, ALL IN ONE PLACE</p>
          <h1 id="contributions-heading">Contributions</h1>
          <p className="page-intro">Every promise and every gift, thoughtfully kept.</p>
        </div>
        {onAdd && (
          <button className="primary-button" type="button" onClick={onAdd}>
            <span className="plus-glyph" aria-hidden="true">+</span>Add contribution
          </button>
        )}
      </div>

      <div className="list-summary-strip">
        <div className="list-summary-item">
          <UsersRound aria-hidden="true" />
          <span>{contributions.length} records</span>
        </div>
        <span className="summary-dot">·</span>
        <div className="list-summary-item">
          <span>Cash received</span>
          <strong>{formatKwacha(cashReceived)}</strong>
        </div>
      </div>

      <div className="list-panel">
        <div className="list-controls">
          <div className="filter-tabs" role="tablist" aria-label="Filter contributions">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={`filter-tab ${filter === item.id ? 'active' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                <span>{item.count}</span>
              </button>
            ))}
          </div>
          <div className="list-tools">
            <label className="search-box">
              <Search aria-hidden="true" />
              <span className="sr-only">Search contributions</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names or gifts" />
            </label>
            <button className="secondary-button export-button" type="button" onClick={downloadCsv} disabled={!filtered.length}>
              <ArrowDownToLine aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
        <div className="contribution-table-heading" aria-hidden="true">
          <span>CONTRIBUTOR</span>
          <span>DATE</span>
          <span>AMOUNT</span>
          <span>STATUS</span>
          <span />
        </div>
        {filtered.length ? (
          <div className="contribution-rows">
            {filtered.map((item) => (
              <ContributionRow key={item.id} contribution={item} onSelect={onSelect} />
            ))}
          </div>
        ) : (
          <div className="list-empty">
            <span className="empty-icon">
              <SlidersHorizontal aria-hidden="true" />
            </span>
            <div>
              <strong>No contributions found</strong>
              <p>Try adjusting your search or status filter.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
