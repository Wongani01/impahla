import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getCurrentUser } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Sign in · Impahla app',
}

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect(user.role === 'admin' ? '/admin' : '/dashboard')
  return <AuthForm mode="login" />
}
