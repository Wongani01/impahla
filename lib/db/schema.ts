import { sql } from 'drizzle-orm'
import {
  index,
  int,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 190 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['user', 'planner', 'admin']).notNull().default('user'),
  status: mysqlEnum('status', ['active', 'disabled']).notNull().default('active'),
  eventName: varchar('event_name', { length: 160 }).notNull().default("Maya's Kitchen Party"),
  eventDate: varchar('event_date', { length: 20 }).notNull().default('28 Nov 2026'),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
})

export const sessions = mysqlTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_sessions_user').on(table.userId)],
)

export const events = mysqlTable('events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  plannerId: varchar('planner_id', { length: 36 }).notNull(),
  plannerName: varchar('planner_name', { length: 120 }).notNull().default('Event Planner'),
  eventName: varchar('event_name', { length: 160 }).notNull(),
  description: text('description').notNull().default(''),
  category: varchar('category', { length: 60 }).notNull().default('Kitchen Party'),
  eventType: varchar('event_type', { length: 60 }).notNull().default('Kitchen Party'),
  hostName: varchar('host_name', { length: 120 }).notNull().default(''),
  eventDate: varchar('event_date', { length: 20 }).notNull().default('2026-11-28'),
  eventTime: varchar('event_time', { length: 20 }).notNull().default('14:00'),
  venue: varchar('venue', { length: 160 }).notNull().default(''),
  location: varchar('location', { length: 160 }).notNull().default('Lusaka, Zambia'),
  contactInfo: varchar('contact_info', { length: 100 }).notNull().default(''),
  expectedAttendees: int('expected_attendees').notNull().default(50),
  coverImage: mediumtext('cover_image'),
  status: mysqlEnum('status', ['active', 'closed', 'cancelled']).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const contributions = mysqlTable(
  'contributions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    eventId: varchar('event_id', { length: 36 }).notNull().default('default-event'),
    name: varchar('name', { length: 120 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 30 }).notNull().default(''),
    contributionType: mysqlEnum('contribution_type', ['cash', 'gift']).notNull().default('cash'),
    amount: int('amount').notNull().default(0),
    paidAmount: int('paid_amount').notNull().default(0),
    gift: varchar('gift', { length: 255 }).notNull().default(''),
    giftValue: int('gift_value').notNull().default(0),
    quantity: int('quantity').notNull().default(1),
    status: mysqlEnum('status', [
      'promised',
      'received',
      'pledged',
      'paid',
      'pending_verification',
      'confirmed',
      'delivered',
      'cancelled',
    ]).notNull().default('received'),
    note: text('note').notNull().default(''),
    date: varchar('date', { length: 10 }).notNull(),
    photo: mediumtext('photo'),
    createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
  },
  (table) => [index('idx_contributions_user').on(table.userId), index('idx_contributions_event').on(table.eventId)],
)

export const siteContent = mysqlTable('site_content', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  title: varchar('title', { length: 160 }).notNull(),
  body: text('body').notNull(),
  updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
})
