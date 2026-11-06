export type ContributionStatus = 'promised' | 'received'

export type Contribution = {
  id: string
  name: string
  amount: number
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
  const receivedCash = contributions.reduce(
    (total, item) => total + (item.status === 'received' ? item.amount : 0),
    0,
  )
  const promisedCash = contributions.reduce(
    (total, item) => total + (item.status === 'promised' ? item.amount : 0),
    0,
  )
  const contributorCount = new Set(contributions.map((item) => item.name.trim().toLocaleLowerCase())).size
  const outstandingGifts = contributions.filter(
    (item) => item.status === 'promised' && item.gift.trim().length > 0,
  ).length

  return { receivedCash, promisedCash, contributorCount, outstandingGifts }
}
