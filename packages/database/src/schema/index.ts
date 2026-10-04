// The single schema entry point drizzle-kit and `client.ts` both read
// (01-conventions.md §1). Order mirrors 02-data-model.md's own section
// order; T-005 appends its modules' files here without touching this file's
// existing exports.
export * from './enums.js';
export * from './auth.js';
export * from './account.js';
export * from './identity.js';
export * from './directory.js';
export * from './taxonomy.js';
export * from './audit.js';
export * from './administration.js';
export * from './demo.js';
// T-005 (§6–§8, §12–§14): retention before evidence (evidence_items.hold_id
// references legal_holds); review before evidence/community/moderation
// (they reference reviews).
export * from './retention.js';
export * from './review.js';
export * from './evidence.js';
export * from './community.js';
export * from './moderation.js';
export * from './notification.js';
export * from './search.js';
export * from './data-requests.js';
