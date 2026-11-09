import { ArrowUpRight, Banknote, Gift } from 'lucide-react'
import { contributionStatusLabel, formatContributionDate, formatKwacha, type Contribution } from '@/lib/contribution-store'

type ContributionRowProps = {
  contribution: Contribution
  onSelect: (contribution: Contribution) => void
  compact?: boolean
}

export function ContributionRow({ contribution, onSelect, compact = false }: ContributionRowProps) {
  const isGift = contribution.contributionType === 'gift'
  const initials = contribution.contributorName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <button className={`contribution-row ${compact ? 'compact-row' : ''}`} type="button" onClick={() => onSelect(contribution)}>
      <span className={`contributor-avatar avatar-${contribution.contributorName.charCodeAt(0) % 5}`}>{initials}</span>
      <span className="contributor-main">
        <strong>{contribution.contributorName}</strong>
        <span>
          {isGift ? (
            <>
              <Gift aria-hidden="true" />
              {contribution.giftDescription || 'Physical gift'}
            </>
          ) : (
            <>
              <Banknote aria-hidden="true" />
              Cash contribution
            </>
          )}
        </span>
      </span>
      {!compact && <span className="contribution-date">{formatContributionDate(contribution.date)}</span>}
      <span className="contribution-value">{isGift ? `Gift ×${contribution.quantity}` : formatKwacha(contribution.cashAmount)}</span>
      <span className={`status-pill ${contribution.contributionStatus}`}>
        <span className="status-dot" />
        {contributionStatusLabel(contribution.contributionStatus)}
      </span>
      <span className="row-arrow">
        <ArrowUpRight aria-hidden="true" />
      </span>
    </button>
  )
}
