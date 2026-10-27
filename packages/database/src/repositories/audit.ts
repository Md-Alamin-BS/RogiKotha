// Stubs only (task step 15) — the read side of `audit_events`. The write
// side is `PgAuditWriter` (`../audit-writer.ts`), implemented, not stubbed,
// because every command uses it. This repository serves the console's
// audit timelines (`moderation.case`'s "last 10", T-404; `/admin/config`
// history, T-408).
import { NotImplemented } from './not-implemented';

export class PgAuditRepository {
  listByStream(stream: string, limit: number): Promise<unknown> {
    throw new NotImplemented('T-404', { stream, limit });
  }
}
