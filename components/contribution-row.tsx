import { ArrowUpRight, Banknote, Gift } from 'lucide-react'
import { formatContributionDate, formatKwacha, type Contribution } from '@/lib/contribution-store'

type ContributionRowProps = {
  contribution: Contribution
  onSelect: (contribution: Contribution) => void
  compact?: boolean
}

export function ContributionRow({ contribution, onSelect, compact = false }: ContributionRowProps) {
  return (
    <button className={`contribution-row ${compact ? 'compact-row' : ''}`} type="button" onClick={() => onSelect(contribution)}>
      <span className={`contributor-avatar avatar-${contribution.name.charCodeAt(0) % 5}`}>{contribution.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
      <span className="contributor-main">
        <strong>{contribution.name}</strong>
        <span>{contribution.gift ? <><Gift aria-hidden="true" />{contribution.gift}</> : <><Banknote aria-hidden="true" />Cash contribution</>}</span>
      </span>
      {!compact && <span className="contribution-date">{formatContributionDate(contribution.date)}</span>}
      <span className="contribution-value">{formatKwacha(contribution.amount)}</span>
      <span className={`status-pill ${contribution.status}`}><span className="status-dot" />{contribution.status === 'received' ? 'Received' : 'Promised'}</span>
      <span className="row-arrow"><ArrowUpRight aria-hidden="true" /></span>
    </button>
  )
}
