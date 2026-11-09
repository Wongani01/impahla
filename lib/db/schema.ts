import { sql } from 'drizzle-orm'
import {
  date,
  foreignKey,
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

export const events = mysqlTable(
  'events',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    plannerId: varchar('planner_id', { length: 36 }).notNull(),
    eventName: varchar('event_name', { length: 160 }).notNull(),
    description: text('description').notNull(),
    category: mysqlEnum('category', ['kitchen_party', 'bridal_shower', 'other']).notNull().default('kitchen_party'),
    hostName: varchar('host_name', { length: 120 }).notNull(),
    eventDate: date('event_date').notNull(),
    eventTime: varchar('event_time', { length: 8 }).notNull(),
    venue: varchar('venue', { length: 160 }).notNull(),
    location: varchar('location', { length: 255 }).notNull(),
    contactInfo: varchar('contact_info', { length: 120 }).notNull(),
    expectedAttendees: int('expected_attendees').notNull().default(0),
    coverImage: mediumtext('cover_image'),
    status: mysqlEnum('status', ['open', 'closed', 'cancelled']).notNull().default('open'),
    createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
  },
  (table) => [
    index('idx_events_planner').on(table.plannerId),
    index('idx_events_status').on(table.status),
    foreignKey({ name: 'fk_events_planner', columns: [table.plannerId], foreignColumns: [users.id] }).onDelete('cascade'),
  ],
)

export const contributions = mysqlTable(
  'contributions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    eventId: varchar('event_id', { length: 36 }).notNull(),
    contributorId: varchar('contributor_id', { length: 36 }),
    contributorName: varchar('contributor_name', { length: 120 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 30 }).notNull(),
    contributionType: mysqlEnum('contribution_type', ['cash', 'gift']).notNull(),
    cashAmount: int('cash_amount').notNull().default(0),
    giftDescription: varchar('gift_description', { length: 255 }).notNull().default(''),
    giftValue: int('gift_value'),
    quantity: int('quantity').notNull().default(1),
    giftImage: mediumtext('gift_image'),
    note: text('note').notNull(),
    contributionStatus: mysqlEnum('contribution_status', [
      'pledged',
      'paid',
      'pending_verification',
      'confirmed',
      'delivered',
      'received',
      'cancelled',
    ]).notNull().default('pledged'),
    date: varchar('date', { length: 10 }).notNull(),
    createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
  },
  (table) => [
    index('idx_contributions_event').on(table.eventId),
    index('idx_contributions_status').on(table.contributionStatus),
    foreignKey({ name: 'fk_contributions_event', columns: [table.eventId], foreignColumns: [events.id] }).onDelete(
      'cascade',
    ),
    foreignKey({
      name: 'fk_contributions_contributor',
      columns: [table.contributorId],
      foreignColumns: [users.id],
    }).onDelete('set null'),
  ],
)

export const siteContent = mysqlTable('site_content', {
  id: int('id').autoincrement().primaryKey(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  title: varchar('title', { length: 160 }).notNull(),
  body: text('body').notNull(),
  updatedAt: timestamp('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
})
