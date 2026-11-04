// BR7.2: the server refuses to start without valid settings, naming each bad variable and never
// its value. Next calls `register()` when a server starts, not during `next build`, so the build
// still needs no `.env` (T-010 hand-off). The container checks again when it is first built.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { readWebEnv } = await import('./server/env');
  readWebEnv();
}
