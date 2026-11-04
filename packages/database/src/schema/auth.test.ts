// BR7.3 (ISS-112, ISS-113): the adapter maps by model name only, so each table's Drizzle property
// names must equal the library's field names. The lists are Better Auth 1.7.14's
// `getAuthTables({})` for email and password with no plugins, plus `id`; the database package
// cannot import the library, so a version bump re-reads them (dependency-check-log.md).
import { getTableColumns } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { RESET_TOKEN_IDENTIFIER_PREFIX } from '../repositories/account';
import { authAccounts, authSessions, authUsers, authVerifications } from './auth';

const LIBRARY_FIELDS: [string, PgTable, string[]][] = [
  ['user', authUsers, ['name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt']],
  [
    'session',
    authSessions,
    ['expiresAt', 'token', 'createdAt', 'updatedAt', 'ipAddress', 'userAgent', 'userId'],
  ],
  [
    'account',
    authAccounts,
    [
      'accountId',
      'providerId',
      'userId',
      'accessToken',
      'refreshToken',
      'idToken',
      'accessTokenExpiresAt',
      'refreshTokenExpiresAt',
      'scope',
      'password',
      'createdAt',
      'updatedAt',
    ],
  ],
  [
    'verification',
    authVerifications,
    ['identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt'],
  ],
];

function indexedColumns(table: PgTable): string[] {
  return getTableConfig(table).indexes.map((index) =>
    index.config.columns.map((column) => ('name' in column ? column.name : '?')).join(','),
  );
}

describe('the auth schema matches what Better Auth 1.7.14 reads and writes', () => {
  it.each(LIBRARY_FIELDS)(
    'the %s table has exactly the library fields plus id as its property names',
    (_model, table, fields) => {
      expect(Object.keys(getTableColumns(table)).sort()).toEqual(['id', ...fields].sort());
    },
  );

  it('indexes sessions and accounts by user and verifications by identifier', () => {
    expect(indexedColumns(authSessions)).toEqual(['user_id']);
    expect(indexedColumns(authAccounts)).toEqual(['user_id']);
    expect(indexedColumns(authVerifications)).toEqual(['identifier']);
  });

  it('reads reset tokens under the identifier prefix the spike recorded', () => {
    expect(RESET_TOKEN_IDENTIFIER_PREFIX).toBe('reset-password:');
  });
});
