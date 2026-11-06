import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth/session'
import {
  createContribution,
  listAllContributions,
  listOwnContributions,
  parseContributionInput,
} from '@/lib/contributions-service'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const scope = new URL(request.url).searchParams.get('scope')

  try {
    if (scope === 'all') {
      if (user.role !== 'admin') return apiError('Administrator access required.', 403)
      return NextResponse.json({ contributions: await listAllContributions() })
    }
    return NextResponse.json({ contributions: await listOwnContributions(user.id) })
  } catch (error) {
    console.error('list contributions failed', error)
    return apiError('Could not load contributions. Is the database running?', 500)
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError('Please sign in.', 401)

  const parsed = parseContributionInput(await request.json().catch(() => null))
  if (!parsed.ok) return apiError(parsed.error)

  try {
    const contribution = await createContribution(user.id, parsed.value)
    return NextResponse.json({ contribution }, { status: 201 })
  } catch (error) {
    console.error('create contribution failed', error)
    return apiError('Could not save this contribution.', 500)
  }
}
