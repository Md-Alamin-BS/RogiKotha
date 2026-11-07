// The demo slice's data functions (intent 261030-demo-slice). Every function takes the Drizzle
// client first; `apps/web/src/server/data.ts` binds them to the app's client.
export * as accounts from './accounts';
export * as doctors from './doctors';
export * as reviews from './reviews';
export * as session from './session';
export type { CreateProfileInput } from './accounts';
