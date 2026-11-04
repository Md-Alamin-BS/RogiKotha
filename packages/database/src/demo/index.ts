// The demo slice's data functions (intent 261030-demo-slice). Every function takes the Drizzle
// client first; `apps/web/src/server/data.ts` binds them to the app's client.
export * as accounts from './accounts';
export * as comments from './comments';
export * as doctors from './doctors';
export * as evidence from './evidence';
export * as facilities from './facilities';
export * as reviews from './reviews';
export * as session from './session';
export { NotBuiltYet } from './not-built';
export type { CreateProfileInput } from './accounts';
