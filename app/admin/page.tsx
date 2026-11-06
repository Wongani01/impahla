import type { Metadata } from 'next'
import { AdminConsole } from '@/components/admin-console'
import { requireAdmin } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Admin console · Impahla app',
}

export default async function AdminPage() {
  const user = await requireAdmin()
  return <AdminConsole user={user} />
}
