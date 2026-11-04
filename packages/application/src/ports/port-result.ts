// Port results carry codes local to the port (`email_exists`, `job_not_enqueued`, ...), which are
// not `ErrorCode`s of 03-routes-and-contracts.md §2: the command maps them to its own result.

export type PortResult<T, C extends string> =
  { ok: true; data: T } | { ok: false; error: { code: C } };

export function portOk<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function portErr<C extends string>(code: C): { ok: false; error: { code: C } } {
  return { ok: false, error: { code } };
}
