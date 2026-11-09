export type ContributionStatus =
  | 'promised'
  | 'received'
  | 'pledged'
  | 'paid'
  | 'pending_verification'
  | 'confirmed'
  | 'delivered'
  | 'cancelled'

export type Contribution = {
  id: string
  userId?: string
  eventId: string
  name: string
  amount: number
  paidAmount: number
  gift: string
  status: ContributionStatus
  note: string
  date: string
  photo?: string
}

export type AdminContribution = Contribution & {
  ownerId: string
  ownerName: string
  ownerEmail: string
}

export function formatKwacha(amount: number): string {
  return `K${new Intl.NumberFormat('en-ZM', { maximumFractionDigits: 0 }).format(amount)}`
}

export function formatContributionDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  return new Intl.DateTimeFormat('en-ZM', { day: 'numeric', month: 'short' }).format(parsed)
}

export function getContributionStats(contributions: Contribution[]) {
  const totalPledged = contributions.reduce((total, item) => total + item.amount, 0)
  const receivedCash = contributions.reduce(
    (total, item) => total + (item.paidAmount > 0 ? item.paidAmount : (item.status === 'received' || item.status === 'paid' || item.status === 'confirmed' ? item.amount : 0)),
    0,
  )
  const promisedCash = Math.max(0, totalPledged - receivedCash)
  const contributorCount = new Set(contributions.map((item) => item.name.trim().toLocaleLowerCase())).size
  const outstandingGifts = contributions.filter(
    (item) => (item.status === 'promised' || item.status === 'pledged') && item.gift.trim().length > 0,
  ).length

  return { receivedCash, promisedCash, totalPledged, contributorCount, outstandingGifts }
}
