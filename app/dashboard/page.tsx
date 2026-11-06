import type { Metadata } from 'next'
import { KitchenPartyApp } from '@/components/kitchen-party-app'
import { requireUser } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'My registry · Impahla app',
}

export default async function DashboardPage() {
  const user = await requireUser()
  return <KitchenPartyApp user={user} />
}
