// The health route's probes (03-routes-and-contracts.md §1, T-101 WF0 step 11). Routes under
// `app/` may not import `database`, so the database probe lives here.
import { getDb } from './db';

export type ProbeState = 'ok' | 'down' | 'unknown';

export interface HealthReport {
  ok: boolean;
  db: ProbeState;
  queue: ProbeState;
  mail: ProbeState;
  scanner: ProbeState;
  mode: string;
}

const PROBE_TIMEOUT_MS = 2000;

/** `select 1` on the shared pool, within two seconds; any failure reads as down. */
export async function probeDatabase(
  query: () => Promise<unknown> = defaultQuery,
): Promise<ProbeState> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), PROBE_TIMEOUT_MS);
  });
  try {
    await Promise.race([query(), timeout]);
    return 'ok';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

function defaultQuery(): Promise<unknown> {
  return getDb().$client.query('select 1');
}

/** Queue (T-009), mail and scanner (T-304) probes stay `unknown` until their tasks wire them. */
export async function healthReport(
  db: () => Promise<ProbeState> = () => probeDatabase(),
): Promise<HealthReport> {
  const dbState = await db();
  return {
    ok: dbState === 'ok',
    db: dbState,
    queue: 'unknown',
    mail: 'unknown',
    scanner: 'unknown',
    mode: process.env.APP_MODE ?? 'unknown',
  };
}
