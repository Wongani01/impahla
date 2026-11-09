import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api'
import { db } from '@/lib/db'
import { contributions, users } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)
  if (user.role !== 'admin') return apiError('Administrator access required.', 403)

  try {
    const userRows = await db.select({ status: users.status, role: users.role }).from(users)
    const contributionRows = await db
      .select({
        contributionStatus: contributions.contributionStatus,
        cashAmount: contributions.cashAmount,
      })
      .from(contributions)

    let receivedTotal = 0
    let promisedTotal = 0
    for (const row of contributionRows) {
      if (['paid', 'confirmed', 'delivered', 'received'].includes(row.contributionStatus)) {
        receivedTotal += row.cashAmount
      } else if (row.contributionStatus !== 'cancelled') {
        promisedTotal += row.cashAmount
      }
    }

    return NextResponse.json({
      stats: {
        totalUsers: userRows.length,
        activeUsers: userRows.filter((row) => row.status === 'active').length,
        disabledUsers: userRows.filter((row) => row.status === 'disabled').length,
        adminUsers: userRows.filter((row) => row.role === 'admin').length,
        totalContributions: contributionRows.length,
        receivedTotal,
        promisedTotal,
      },
    })
  } catch (error) {
    console.error('admin stats failed', error)
    return apiError('Could not load analytics. Is the database running?', 500)
  }
}
