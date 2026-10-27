// The single schema entry point drizzle-kit and `client.ts` both read
// (01-conventions.md §1). Order mirrors 02-data-model.md's own section
// order; T-005 appends its modules' files here without touching this file's
// existing exports.
export * from './enums';
export * from './auth';
export * from './account';
export * from './identity';
export * from './directory';
export * from './taxonomy';
export * from './audit';
export * from './administration';
export * from './demo';
// T-005 (§6–§8, §12–§14): retention before evidence (evidence_items.hold_id
// references legal_holds); review before evidence/community/moderation
// (they reference reviews).
export * from './retention';
export * from './review';
export * from './evidence';
export * from './community';
export * from './moderation';
export * from './notification';
export * from './search';
export * from './data-requests';
