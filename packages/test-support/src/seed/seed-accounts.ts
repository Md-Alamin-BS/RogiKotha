// seed-accounts: `auth_users` + `auth_accounts` (credential rows with
// Argon2id hashes, the same parameters T-101 pins — task's "Not in scope"),
// `account_profiles`, `account_preferences`, personas + `persona_links`,
// staff roles. No `staff_devices` rows: every staff account goes through
// device approval on first sign-in (storyboard).
//
// Idempotent by `account_profiles.username` (the table's natural unique
// key — `seed_ref` does not exist on this table). Named/pseudonymous
// personas have no `seed_ref` column either; looked up by `(kind,
// username)`. Anonymous personas are **not** created here — an anonymous
// persona's `persona_links.review_id` has a real FK to `reviews.id`
// (`0004_deferred_fks.sql`), and reviews do not exist until seed-content.ts
// runs after this step; seed-content.ts creates them on demand instead
// (see that file's `ensureAnonymousPersona`).
import { hash } from '@node-rs/argon2';
import { newId } from '@rogikotha/contracts';
import {
  accountPreferences,
  accountProfiles,
  authAccounts,
  authUsers,
  personaLinks,
  personas,
  type Db,
} from '@rogikotha/database';
import { eq } from 'drizzle-orm';

import { ACCOUNTS, PERSONAS } from '../corpus/index.js';
import type { SeedContext } from './seed.js';

const DEMO_PASSWORD = 'demo-pass-2026!';
// Same parameters T-101 pins for the real adapter (03-routes-and-contracts.md
// §3 `PasswordHasher`: "m=64 MiB, t=3, p=1"). `algorithm: 2` is
// `Algorithm.Argon2id` — the numeric value is used directly because
// `@node-rs/argon2`'s `Algorithm` is an *ambient* `const enum` (native
// binding types), which `verbatimModuleSyntax` refuses to import as a
// value (TS2748).
const ARGON2_OPTIONS = { memoryCost: 65536, timeCost: 3, parallelism: 1, algorithm: 2 as const };

async function findOne<T>(rows: Promise<T[]>): Promise<T | undefined> {
  const [row] = await rows;
  return row;
}

export async function seedAccounts(db: Db, ctx: SeedContext): Promise<number> {
  let inserted = 0;
  const passwordHash = await hash(DEMO_PASSWORD, ARGON2_OPTIONS);

  for (const account of ACCOUNTS) {
    const existing = await findOne(
      db
        .select()
        .from(accountProfiles)
        .where(eq(accountProfiles.username, account.username))
        .limit(1),
    );
    if (existing) {
      ctx.accountIdByUsername.set(account.username, existing.id);
      ctx.authUserIdByUsername.set(account.username, existing.authUserId);
      continue;
    }

    const authUserId = newId();
    await db.insert(authUsers).values({
      id: authUserId,
      email: account.email,
      emailVerified: true,
      name: null,
    });

    await db.insert(authAccounts).values({
      id: newId(),
      accountId: authUserId,
      providerId: 'credential',
      userId: authUserId,
      password: passwordHash,
    });

    const now = new Date();
    const [profile] = await db
      .insert(accountProfiles)
      .values({
        id: newId(),
        authUserId,
        username: account.username,
        usernameKey: account.username.toLowerCase(),
        displayName: account.displayName.en,
        locale: 'en',
        status: 'active',
        staffRole: account.role ?? undefined,
        ageConfirmedAt: now,
        termsVersion: '1',
        termsAcceptedAt: now,
        lastSeenAt: now,
      })
      .returning();
    const accountId = profile!.id;

    await db.insert(accountPreferences).values({
      accountId,
      interfaceLocale: 'en',
      emailSecurity: true,
      emailModeration: true,
      emailEvidence: true,
      emailDiscussion: false,
    });

    ctx.accountIdByUsername.set(account.username, accountId);
    ctx.authUserIdByUsername.set(account.username, authUserId);
    inserted += 1;
  }

  // Named/pseudonymous personas — one row per corpus persona, linked
  // privately to its account. Anonymous personas are seed-content.ts's job.
  for (const p of PERSONAS) {
    if (p.kind === 'anonymous') continue;
    if (ctx.personaIdByKey.has(p.key)) continue;

    const existing = p.username
      ? await findOne(db.select().from(personas).where(eq(personas.username, p.username)).limit(1))
      : undefined;
    if (existing) {
      ctx.personaIdByKey.set(p.key, existing.id);
      continue;
    }

    const accountId = p.accountUsername
      ? ctx.accountIdByUsername.get(p.accountUsername)
      : undefined;
    const [persona] = await db
      .insert(personas)
      .values({
        id: newId(),
        kind: p.kind,
        displayName: p.displayName.en,
        username: p.username,
        avatarHue: p.avatarHue,
      })
      .returning();
    if (accountId) {
      await db.insert(personaLinks).values({ personaId: persona!.id, accountId, reviewId: null });
    }
    ctx.personaIdByKey.set(p.key, persona!.id);
    inserted += 1;
  }

  return inserted;
}
