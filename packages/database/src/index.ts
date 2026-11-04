// The package's single entry point (01-conventions.md §1).
export * from './client';
export * from './schema/index';
export * from './audit-writer';

export * from './repositories/account';
export * from './repositories/identity';
export * from './repositories/directory';
export * from './repositories/taxonomy';
export * from './repositories/config';
export * from './repositories/audit';
export * from './repositories/not-implemented';
export * from './repositories/review';
export * from './repositories/evidence';
export * from './repositories/community';
export * from './repositories/moderation';
export * from './repositories/notification';
export * from './repositories/retention';
export * from './repositories/data-requests';
export * from './repositories/outbox';
export * from './search/index';
export * from './queue/index';
// Demo slice (FD-099): replaced by the repositories above when the full Units resume.
export * as demo from './demo/index';
