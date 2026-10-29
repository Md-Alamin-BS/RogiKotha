// seed-config: config version 1 (`DEFAULT_CONFIG_VALUES` merged with the
// corpus's `emergency.lastVerified`), retention policy v1 (90/180/90),
// `demo_clock` row (offset 0). Idempotent by `version` (config_versions,
// retention_policies are `version int unique`) and by the `demo_clock`
// singleton row (`id = 1`).
import { DEFAULT_CONFIG_VALUES, newId, type ConfigValues } from '@rogikotha/contracts';
import { configVersions, demoClock, retentionPolicies, type Db } from '@rogikotha/database';
import { eq } from 'drizzle-orm';

import { CORPUS_CONFIG } from '../corpus/index.js';
import type { SeedContext } from './seed.js';

export async function seedConfig(db: Db, ctx: SeedContext): Promise<number> {
  let inserted = 0;
  const actorAccountId = ctx.accountIdByUsername.get('sa_founder');
  if (!actorAccountId) {
    throw new Error(
      'seed-config: sa_founder account must be seeded first (see seed.ts step order)',
    );
  }

  const [existingConfig] = await db
    .select()
    .from(configVersions)
    .where(eq(configVersions.version, 1))
    .limit(1);
  if (!existingConfig) {
    const values: ConfigValues = {
      ...DEFAULT_CONFIG_VALUES,
      thresholds: { ...DEFAULT_CONFIG_VALUES.thresholds, ...CORPUS_CONFIG.thresholds },
      retention: { ...DEFAULT_CONFIG_VALUES.retention, ...CORPUS_CONFIG.retention },
      limitedDataThreshold: CORPUS_CONFIG.limitedDataThreshold,
      emergency: {
        ambulance: CORPUS_CONFIG.emergency.ambulance,
        healthLine: CORPUS_CONFIG.emergency.healthLine,
        crisisLine: CORPUS_CONFIG.emergency.crisisLine,
        lastVerified: CORPUS_CONFIG.emergency.lastVerified,
      },
    };
    await db.insert(configVersions).values({
      id: newId(),
      version: 1,
      schemaVersion: 1,
      values,
      actorAccountId,
      reason: 'Initial demo configuration',
      effectiveFrom: new Date(),
    });
    inserted += 1;
  }

  const [existingPolicy] = await db
    .select()
    .from(retentionPolicies)
    .where(eq(retentionPolicies.version, 1))
    .limit(1);
  if (!existingPolicy) {
    await db.insert(retentionPolicies).values({
      id: newId(),
      version: 1,
      originalDays: 90,
      auditDays: 180,
      notificationDays: 90,
      effectiveFrom: new Date(),
      actorAccountId,
      reason: 'Initial demo retention policy',
    });
    inserted += 1;
  }

  const [existingClock] = await db.select().from(demoClock).where(eq(demoClock.id, 1)).limit(1);
  if (!existingClock) {
    await db.insert(demoClock).values({ id: 1, offsetSeconds: 0n, setBy: actorAccountId });
    inserted += 1;
  }

  return inserted;
}
