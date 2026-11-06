'use client'

import { useMemo, useState } from 'react'
import { ArrowDownToLine, Search, SlidersHorizontal, UsersRound } from 'lucide-react'
import { ContributionRow } from '@/components/contribution-row'
import { formatKwacha, type Contribution, type ContributionStatus } from '@/lib/contribution-store'

type Filter = 'all' | ContributionStatus

type ContributionListViewProps = {
  contributions: Contribution[]
  onAdd: () => void
  onSelect: (contribution: Contribution) => void
}

export function ContributionListView({ contributions, onAdd, onSelect }: ContributionListViewProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return contributions.filter((item) => {
      const matchesFilter = filter === 'all' || item.status === filter
      const matchesQuery = !normalizedQuery || [item.name, item.gift, item.note].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
      return matchesFilter && matchesQuery
    })
  }, [contributions, filter, query])

  const downloadCsv = () => {
    const rows = [
      ['Contributor', 'Cash (ZMW)', 'Gift / contribution', 'Status', 'Date noted', 'Note'],
      ...filtered.map((item) => [item.name, String(item.amount), item.gift, item.status, item.date, item.note]),
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
    { id: 'promised', label: 'Promised', count: contributions.filter((item) => item.status === 'promised').length },
    { id: 'received', label: 'Received', count: contributions.filter((item) => item.status === 'received').length },
  ]

  return (
    <section className="contributions-page" aria-labelledby="contributions-heading">
      <div className="page-heading-row">
        <div><p className="section-kicker">YOUR EVENT, ALL IN ONE PLACE</p><h1 id="contributions-heading">Contributions</h1><p className="page-intro">Every promise and every gift, thoughtfully kept.</p></div>
        <button className="primary-button" type="button" onClick={onAdd}><span className="plus-glyph" aria-hidden="true">+</span>Add contribution</button>
      </div>

      <div className="list-summary-strip">
        <div className="list-summary-item"><UsersRound aria-hidden="true" /><span>{contributions.length} records</span></div>
        <span className="summary-dot">·</span>
        <div className="list-summary-item"><span>Cash received</span><strong>{formatKwacha(contributions.filter((item) => item.status === 'received').reduce((sum, item) => sum + item.amount, 0))}</strong></div>
      </div>

      <div className="list-panel">
        <div className="list-controls">
          <div className="filter-tabs" role="tablist" aria-label="Filter contributions">
            {filters.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={`filter-tab ${filter === item.id ? 'active' : ''}`} onClick={() => setFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}
          </div>
          <div className="list-tools">
            <label className="search-box"><Search aria-hidden="true" /><span className="sr-only">Search contributions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names or gifts" /></label>
            <button className="secondary-button export-button" type="button" onClick={downloadCsv} disabled={!filtered.length}><ArrowDownToLine aria-hidden="true" /><span>Export CSV</span></button>
          </div>
        </div>
        <div className="contribution-table-heading" aria-hidden="true"><span>CONTRIBUTOR</span><span>DATE</span><span>AMOUNT</span><span>STATUS</span><span /></div>
        {filtered.length ? <div className="contribution-rows">{filtered.map((item) => <ContributionRow key={item.id} contribution={item} onSelect={onSelect} />)}</div> : (
          <div className="list-empty"><div className="empty-icon"><SlidersHorizontal aria-hidden="true" /></div><h2>{query ? 'No matches found' : filter === 'all' ? 'Your registry is ready' : `No ${filter} contributions yet`}</h2><p>{query ? 'Try another name or gift description.' : 'Add your first contribution to start keeping track.'}</p>{!query && filter === 'all' && <button type="button" className="secondary-button" onClick={onAdd}>Add a contribution</button>}</div>
        )}
      </div>
      <p className="list-privacy-note">Your registry is stored privately with your account. The CSV includes only the records shown here.</p>
    </section>
  )
}
