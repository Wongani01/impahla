import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import * as schema from '@/lib/db/schema'

const globalForDb = globalThis as unknown as { mphatsoPool?: mysql.Pool }

const url = process.env.DATABASE_URL ?? 'mysql://root@127.0.0.1:3306/mphatso'

export const pool =
  globalForDb.mphatsoPool ??
  mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 5,
    enableKeepAlive: true,
  })

if (process.env.NODE_ENV !== 'production') globalForDb.mphatsoPool = pool

export const db = drizzle(pool, { schema, mode: 'default' })
