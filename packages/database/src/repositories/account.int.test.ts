// PgAccountRepository against DATABASE_URL_TEST (T-101 functional-spec § 11, database row).
import { newId } from '@rogikotha/contracts';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountPreferences, accountProfiles, feedback } from '../schema/account';
import { personaLinks, personas } from '../schema/identity';
import { testDb } from '../test-setup';
import { PgAccountRepository } from './account';
import {
  appTx,
  buildAccount,
  buildAuthUser,
  buildResetToken,
  uniqueSuffix,
} from './account-test-support';

const repo = new PgAccountRepository();
const tx = appTx(testDb);

describe('PgAccountRepository profile reads', () => {
  it('finds a profile by its auth user id and by its account id', async () => {
    const account = await buildAccount(testDb);
    const expected = {
      accountId: account.accountId,
      authUserId: account.authUserId,
      username: account.username,
      displayName: account.displayName,
      locale: 'bn',
      status: 'pending_verification',
    };

    expect(await repo.findProfileByAuthUserId(tx, account.authUserId)).toEqual(expected);
    expect(await repo.findProfileById(tx, account.accountId)).toEqual(expected);
  });

  it('returns null for an auth user or account id with no profile', async () => {
    const user = await buildAuthUser(testDb);

    expect(await repo.findProfileByAuthUserId(tx, user.authUserId)).toBeNull();
    expect(await repo.findProfileById(tx, newId())).toBeNull();
  });

  it('still returns a deleted profile, so the command decides what deleted means', async () => {
    const account = await buildAccount(testDb);
    await repo.updateStatus(tx, account.accountId, 'deleted');

    expect(await repo.findProfileById(tx, account.accountId)).toMatchObject({ status: 'deleted' });
    expect(await repo.findByEmail(tx, account.email)).toMatchObject({ status: 'deleted' });
  });
});

describe('PgAccountRepository email and credential reads', () => {
  it('finds the profile behind an address with its status', async () => {
    const account = await buildAccount(testDb);

    expect(await repo.findByEmail(tx, account.email)).toEqual({
      accountId: account.accountId,
      authUserId: account.authUserId,
      status: 'pending_verification',
    });
  });

  it('finds nothing for an unknown address or for a library user that has no profile', async () => {
    const orphan = await buildAuthUser(testDb);

    expect(await repo.findByEmail(tx, `nobody.demo+${uniqueSuffix()}@example.test`)).toBeNull();
    expect(await repo.findByEmail(tx, orphan.email)).toBeNull();
    expect(await repo.findCredentialByEmail(tx, orphan.email)).toBeNull();
  });

  it('returns the credential hash by address and by account id', async () => {
    const account = await buildAccount(testDb);
    const expected = {
      accountId: account.accountId,
      authUserId: account.authUserId,
      status: 'pending_verification',
      passwordHash: account.passwordHash,
    };

    expect(await repo.findCredentialByEmail(tx, account.email)).toEqual(expected);
    expect(await repo.findCredentialByAccountId(tx, account.accountId)).toEqual(expected);
  });

  it('returns no credential for a profile whose library user has no credential row', async () => {
    const user = await buildAuthUser(testDb, { withCredential: false });
    const accountId = newId();
    await repo.createProfile(tx, {
      accountId,
      authUserId: user.authUserId,
      username: `nocred_${uniqueSuffix()}`.slice(0, 24),
      displayName: 'No Credential Demo',
      locale: 'en',
      ageConfirmedAt: new Date(),
      termsVersion: 'terms-demo-1',
      termsAcceptedAt: new Date(),
    });

    expect(await repo.findCredentialByAccountId(tx, accountId)).toBeNull();
    expect(await repo.findCredentialByEmail(tx, user.email)).toBeNull();
  });

  it("returns the holder's own address and null for an unknown account", async () => {
    const account = await buildAccount(testDb);

    expect(await repo.findOwnEmail(tx, account.accountId)).toBe(account.email);
    expect(await repo.findOwnEmail(tx, newId())).toBeNull();
  });
});

describe('PgAccountRepository.findResetTokenAccount over the library verification row', () => {
  it('resolves a reset token to its account, address and expiry', async () => {
    const account = await buildAccount(testDb);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const token = await buildResetToken(testDb, account.authUserId, expiresAt);

    expect(await repo.findResetTokenAccount(tx, token)).toEqual({
      accountId: account.accountId,
      authUserId: account.authUserId,
      status: 'pending_verification',
      email: account.email,
      expiresAt,
    });
  });

  it('does not consume the token: a second read finds the same row', async () => {
    const account = await buildAccount(testDb);
    const token = await buildResetToken(testDb, account.authUserId);

    await repo.findResetTokenAccount(tx, token);

    expect(await repo.findResetTokenAccount(tx, token)).toMatchObject({
      accountId: account.accountId,
    });
  });

  it('returns an expired token with its past expiry, so the command can refuse it', async () => {
    const account = await buildAccount(testDb);
    const expiresAt = new Date(Date.now() - 60 * 1000);
    const token = await buildResetToken(testDb, account.authUserId, expiresAt);

    expect(await repo.findResetTokenAccount(tx, token)).toMatchObject({ expiresAt });
  });

  it('returns null for an unknown token and for a token given without its prefix match', async () => {
    const account = await buildAccount(testDb);
    const token = await buildResetToken(testDb, account.authUserId);

    expect(await repo.findResetTokenAccount(tx, 'unknownunknownunknown123')).toBeNull();
    expect(await repo.findResetTokenAccount(tx, `reset-password:${token}`)).toBeNull();
  });
});

describe('PgAccountRepository usernames and profile creation', () => {
  it('treats a username as taken without regard to case (citext)', async () => {
    const suffix = uniqueSuffix();
    await buildAccount(testDb, { username: `shirin_${suffix}` });

    expect(await repo.usernameTaken(tx, `Shirin_${suffix}`)).toBe(true);
    expect(await repo.usernameTaken(tx, `rahim_${suffix}`)).toBe(false);
  });

  it('counts a deleted profile as holding its username', async () => {
    const account = await buildAccount(testDb);
    await repo.updateStatus(tx, account.accountId, 'deleted');

    expect(await repo.usernameTaken(tx, account.username)).toBe(true);
  });

  it('creates a pending profile with the NFC lowercase username key and the terms fields', async () => {
    const suffix = uniqueSuffix();
    const account = await buildAccount(testDb, { username: `Shirin_${suffix}` });

    const [row] = await testDb
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.id, account.accountId));
    expect(row).toMatchObject({
      status: 'pending_verification',
      usernameKey: `shirin_${suffix}`,
      termsVersion: 'terms-demo-1',
      staffRole: null,
      lastSeenAt: null,
    });
    expect(row?.ageConfirmedAt).toBeInstanceOf(Date);
    expect(row?.termsAcceptedAt).toBeInstanceOf(Date);
  });

  it('returns username_taken on a case-variant race and leaves the transaction usable', async () => {
    const suffix = uniqueSuffix();
    await buildAccount(testDb, { username: `shirin_${suffix}` });
    const late = await buildAuthUser(testDb);

    const outcome = await testDb.transaction(async (drizzleTx) => {
      const lateTx = appTx(drizzleTx);
      const created = await repo.createProfile(lateTx, {
        accountId: newId(),
        authUserId: late.authUserId,
        username: `SHIRIN_${suffix}`,
        displayName: 'Late Demo',
        locale: 'en',
        ageConfirmedAt: new Date(),
        termsVersion: 'terms-demo-1',
        termsAcceptedAt: new Date(),
      });
      const stillUsable = await drizzleTx.execute(sql`select 1 as one`);
      return { created, stillUsable: stillUsable.rows };
    });

    expect(outcome.created).toEqual({ ok: false, error: { code: 'username_taken' } });
    expect(outcome.stillUsable).toEqual([{ one: 1 }]);
  });

  it('rethrows a unique violation that is not the username', async () => {
    const account = await buildAccount(testDb);

    await expect(
      repo.createProfile(tx, {
        accountId: newId(),
        authUserId: account.authUserId,
        username: `other_${uniqueSuffix()}`.slice(0, 24),
        displayName: 'Same Auth User Demo',
        locale: 'en',
        ageConfirmedAt: new Date(),
        termsVersion: 'terms-demo-1',
        termsAcceptedAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  it('updates the status of one account only', async () => {
    const first = await buildAccount(testDb);
    const second = await buildAccount(testDb);

    await repo.updateStatus(tx, first.accountId, 'active');

    expect(await repo.findProfileById(tx, first.accountId)).toMatchObject({ status: 'active' });
    expect(await repo.findProfileById(tx, second.accountId)).toMatchObject({
      status: 'pending_verification',
    });
  });
});

describe('PgAccountRepository default personas', () => {
  it('inserts one named and one pseudonymous persona, each privately linked to the account', async () => {
    const account = await buildAccount(testDb);
    const namedPersonaId = newId();
    const pseudonymousPersonaId = newId();

    await repo.insertDefaultPersonas(tx, {
      accountId: account.accountId,
      username: account.username,
      displayName: account.displayName,
      namedPersonaId,
      pseudonymousPersonaId,
    });

    const rows = await testDb
      .select({
        id: personas.id,
        kind: personas.kind,
        displayName: personas.displayName,
        username: personas.username,
        reviewId: personaLinks.reviewId,
      })
      .from(personaLinks)
      .innerJoin(personas, eq(personas.id, personaLinks.personaId))
      .where(eq(personaLinks.accountId, account.accountId));
    expect(rows.sort((a, b) => a.kind.localeCompare(b.kind))).toEqual([
      {
        id: namedPersonaId,
        kind: 'named',
        displayName: account.displayName,
        username: account.username,
        reviewId: null,
      },
      {
        id: pseudonymousPersonaId,
        kind: 'pseudonymous',
        displayName: account.username,
        username: account.username,
        reviewId: null,
      },
    ]);
  });
});

describe('PgAccountRepository preferences and feedback', () => {
  it('inserts preferences with the schema defaults and the registration locale', async () => {
    const account = await buildAccount(testDb);

    await repo.insertPreferences(tx, { accountId: account.accountId, interfaceLocale: 'bn' });

    expect(await repo.findPreferences(tx, account.accountId)).toEqual({
      accountId: account.accountId,
      interfaceLocale: 'bn',
      emailSecurity: true,
      emailModeration: true,
      emailEvidence: true,
      emailDiscussion: false,
    });
  });

  it('returns null preferences for an account that has none', async () => {
    const account = await buildAccount(testDb);

    expect(await repo.findPreferences(tx, account.accountId)).toBeNull();
  });

  it('saves only the patched preference fields and stamps updated_at', async () => {
    const account = await buildAccount(testDb);
    await repo.insertPreferences(tx, { accountId: account.accountId, interfaceLocale: 'bn' });

    await repo.savePreferences(tx, account.accountId, {
      interfaceLocale: 'en',
      emailDiscussion: true,
    });

    expect(await repo.findPreferences(tx, account.accountId)).toMatchObject({
      interfaceLocale: 'en',
      emailDiscussion: true,
      emailSecurity: true,
    });
    const [row] = await testDb
      .select({ updatedAt: accountPreferences.updatedAt })
      .from(accountPreferences)
      .where(eq(accountPreferences.accountId, account.accountId));
    expect(row?.updatedAt).toBeInstanceOf(Date);
  });

  it('inserts a text-only feedback row for the account', async () => {
    const account = await buildAccount(testDb);
    const id = newId();

    await repo.insertFeedback(tx, {
      id,
      accountId: account.accountId,
      body: 'The search page was easy to use.',
      locale: 'en',
    });

    const rows = await testDb.select().from(feedback).where(eq(feedback.id, id));
    expect(rows).toEqual([
      expect.objectContaining({
        accountId: account.accountId,
        body: 'The search page was easy to use.',
        locale: 'en',
      }),
    ]);
  });
});
