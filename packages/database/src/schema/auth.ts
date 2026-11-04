// Better Auth's Drizzle adapter owns these four tables (02-data-model.md
// §1); application code reads them only through the account repository.
// The ids are `text` primary keys because the library writes them (the web
// instance passes `newId()` as its id generator), unlike every other table here.
//
// Wiring the adapter (ISS-112, BR7.3): map only the model names, never a
// `fields` block. The adapter finds a table by model name in the schema
// object and a column by its Drizzle property name, and the property names
// below already equal the library's field names; `casing: 'snake_case'`
// turns them into the columns. Either key the schema object by the library's
// model names (`{ user: authUsers, session: authSessions, account:
// authAccounts, verification: authVerifications }`) or key it by these table
// names and set each `modelName` to the table name, as
// `apps/web/src/server/auth/instance.ts` does. A `fields` block that maps a
// property to a snake_case column makes the adapter throw at start.
//
// The property lists equal Better Auth 1.7.14's `getAuthTables({})` for
// email and password with no plugins (pinned by `auth.test.ts`).
import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const authUsers = pgTable('auth_users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // ISS-113: the session list and sign out everywhere look sessions up by user.
  (t) => [index('auth_sessions_user_id_idx').on(t.userId)],
);

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('auth_accounts_user_id_idx').on(t.userId)],
);

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // ISS-113: reset tokens are found by `identifier` ('reset-password:<token>').
  (t) => [index('auth_verifications_identifier_idx').on(t.identifier)],
);
