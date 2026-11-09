export type ContributionType = 'cash' | 'gift'

export type ContributionStatus =
  | 'pledged'
  | 'paid'
  | 'pending_verification'
  | 'confirmed'
  | 'delivered'
  | 'received'
  | 'cancelled'

export type Contribution = {
  id: string
  eventId: string
  contributorId: string | null
  contributorName: string
  phoneNumber: string
  contributionType: ContributionType
  cashAmount: number
  giftDescription: string
  giftValue: number | null
  quantity: number
  giftImage: string | null
  note: string
  contributionStatus: ContributionStatus
  date: string
}

export type AdminContribution = Contribution & {
  ownerId: string | null
  ownerName: string
  ownerEmail: string
}

export const CONTRIBUTION_TYPES: ContributionType[] = ['cash', 'gift']

export const CONTRIBUTION_STATUSES: ContributionStatus[] = [
  'pledged',
  'paid',
  'pending_verification',
  'confirmed',
  'delivered',
  'received',
  'cancelled',
]

export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatus, string> = {
  pledged: 'Pledged',
  paid: 'Paid',
  pending_verification: 'Pending verification',
  confirmed: 'Confirmed',
  delivered: 'Delivered',
  received: 'Received',
  cancelled: 'Cancelled',
}

export const CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string> = {
  cash: 'Cash',
  gift: 'Physical gift',
}

/** Statuses counted as cash that is already in hand. */
const CASH_IN_HAND: ContributionStatus[] = ['paid', 'confirmed', 'delivered', 'received']
/** Statuses counted as a gift that is still outstanding. */
const GIFT_OUTSTANDING: ContributionStatus[] = ['pledged', 'pending_verification']

export function contributionStatusLabel(status: string): string {
  return CONTRIBUTION_STATUS_LABELS[status as ContributionStatus] ?? status
}

export function isCashInHand(status: ContributionStatus): boolean {
  return CASH_IN_HAND.includes(status)
}

export function formatKwacha(amount: number): string {
  return `K${new Intl.NumberFormat('en-ZM', { maximumFractionDigits: 0 }).format(amount)}`
}

export function formatContributionDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('en-ZM', { day: 'numeric', month: 'short' }).format(parsed)
}

export function getContributionStats(contributions: Contribution[]) {
  let totalPledged = 0
  let receivedCash = 0
  let outstandingGifts = 0
  const people = new Set<string>()

  for (const item of contributions) {
    totalPledged += item.cashAmount
    if (isCashInHand(item.contributionStatus)) receivedCash += item.cashAmount
    if (item.contributionType === 'gift' && GIFT_OUTSTANDING.includes(item.contributionStatus)) outstandingGifts += 1
    people.add(item.contributorName.trim().toLocaleLowerCase())
  }

  const promisedCash = Math.max(0, totalPledged - receivedCash)

  return { receivedCash, promisedCash, totalPledged, contributorCount: people.size, outstandingGifts }
}
