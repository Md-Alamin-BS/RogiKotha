// Better Auth's Drizzle adapter owns these four tables (02-data-model.md
// §1); application code reads them only through the account repository.
// Better Auth generates its own row ids (not `newId()`/uuidv7), hence
// `text` primary keys here, unlike every other table in this package.
//
// T-101 must pass this exact `modelName`/`fields` mapping to the adapter so
// the library's `user`/`session`/`account`/`verification` model names
// resolve to these table names and snake_case columns:
//
//   user: {
//     modelName: 'auth_users',
//     fields: { emailVerified: 'email_verified', createdAt: 'created_at', updatedAt: 'updated_at' },
//   },
//   session: {
//     modelName: 'auth_sessions',
//     fields: {
//       userId: 'user_id', ipAddress: 'ip_address', userAgent: 'user_agent',
//       expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at',
//     },
//   },
//   account: {
//     modelName: 'auth_accounts',
//     fields: {
//       accountId: 'account_id', providerId: 'provider_id', userId: 'user_id',
//       accessToken: 'access_token', refreshToken: 'refresh_token', idToken: 'id_token',
//       accessTokenExpiresAt: 'access_token_expires_at', refreshTokenExpiresAt: 'refresh_token_expires_at',
//       createdAt: 'created_at', updatedAt: 'updated_at',
//     },
//   },
//   verification: {
//     modelName: 'auth_verifications',
//     fields: { expiresAt: 'expires_at', createdAt: 'created_at', updatedAt: 'updated_at' },
//   },
//
// Verified against Better Auth's 1.7.x Drizzle-adapter docs and the fields
// its core schema actually defines (docs/status/dependency-check-log.md);
// no columns beyond this list are required for email/password auth with no
// plugins.
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const authUsers = pgTable('auth_users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable('auth_sessions', {
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
});

export const authAccounts = pgTable('auth_accounts', {
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
});

export const authVerifications = pgTable('auth_verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
