// The read behind the experience page's comment slot (C16). Kept out of `comments.ts`, which is a
// `'use server'` file: this is called by the server component only and must not become an endpoint.
import type { ThreadVM } from '@rogikotha/contracts';

import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

/** A refused or failed thread read; the slot logs its name (the error code) and shows its fallback. */
class ThreadReadError extends Error {
  constructor(code: string) {
    super(code);
    this.name = code;
  }
}

/** The thread of one review for the current viewer; an unknown or unpublished review reads closed. */
export async function loadThread(reviewPublicId: string): Promise<ThreadVM> {
  const result = await runCommand(getContainer().community.getThread, { reviewPublicId });
  if (!result.ok) throw new ThreadReadError(result.error.code);
  return result.data;
}
