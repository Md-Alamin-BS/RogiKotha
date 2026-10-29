// FX17 (violation): the worker may not load Better Auth with import() either (BR1.4, BR3.4).
export const loadAuth = async () => await import('better-auth');
