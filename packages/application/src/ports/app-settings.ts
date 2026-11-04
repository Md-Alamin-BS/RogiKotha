// Values from `apps/web/src/server/env.ts`, read when the container is built, never at module load
// (BR7.2).

export interface AppSettings {
  /** e.g. `http://localhost:3000`, no trailing slash; the base of every email link. */
  appUrl: string;
  /** Stored on the profile at registration; register refuses to start without it. */
  termsVersion: string;
}
