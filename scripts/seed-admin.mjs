// Creates or refreshes the default admin account.
// Usage: pnpm seed:admin   (reads .env.local / process.env)
import { randomBytes, randomUUID, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { readFileSync } from 'node:fs'
import mysql from 'mysql2/promise'

const scryptAsync = promisify(scrypt)

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      const key = match[1]
      let value = match[2].trim().replace(/^['"]|['"]$/g, '')
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // .env.local is optional
  }
}

loadEnvFile(new URL('../.env.local', import.meta.url))

const url = process.env.DATABASE_URL ?? 'mysql://root@127.0.0.1:3306/mphatso'
const email = (process.env.ADMIN_EMAIL ?? 'admin@mphatso.local').toLowerCase()
const password = process.env.ADMIN_PASSWORD ?? 'Admin@12345'
const name = process.env.ADMIN_NAME ?? 'Registry Admin'

async function hashPassword(value) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scryptAsync(value, salt, 64)
  return `scrypt$${salt}$${derived.toString('hex')}`
}

const connection = await mysql.createConnection({ uri: url })

try {
  const hash = await hashPassword(password)
  await connection.query(
    `INSERT INTO users (id, name, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'admin', 'active')
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       role = 'admin',
       status = 'active'`,
    [randomUUID(), name, email, hash],
  )
  console.log(`✔ Admin ready → ${email}`)
  console.log(`  Password: ${password}`)
} catch (error) {
  console.error('✘ Could not seed the admin account.')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await connection.end()
}
