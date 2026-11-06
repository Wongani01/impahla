import { NextResponse } from 'next/server'

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
