'use server';

import type { OwnEvidenceList } from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';

import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

// Attachments on an experience (FR5, U48). Only the experience's author lists and removes the
// files; the public sees the count alone (FR5.3). Uploads go to `POST /api/evidence/upload`.
// Originals never leave the server.

export type { OwnEvidenceFile, OwnEvidenceList, OwnEvidenceStatus } from '@rogikotha/contracts';

/**
 * The signed-in author's files on their experience, or null for anyone else (signed out, not the
 * author, unknown or malformed id). Pages render the uploader only when this is not null.
 */
export async function listOwnEvidenceFiles(
  reviewPublicId: string,
): Promise<OwnEvidenceList | null> {
  const result = await runCommand(getContainer().evidence.getForAuthor, { reviewPublicId });
  return result.ok ? result.data : null;
}

export type RemoveEvidenceState =
  | { status: 'removed' }
  | {
      status: 'error';
      messageKey:
        'ev.upload.errors.signedOut' | 'ev.upload.errors.notFound' | 'ev.upload.errors.failed';
    };

/** Removes one of the actor's own files (WF4, BR6.3); anyone else's reads as not found. */
export async function removeEvidence(itemPublicId: string): Promise<RemoveEvidenceState> {
  const result = await runCommand(getContainer().evidence.remove, { itemPublicId });
  if (!result.ok) {
    const code = result.error.code;
    if (code === 'forbidden') return { status: 'error', messageKey: 'ev.upload.errors.signedOut' };
    if (code === 'not_found' || code === 'validation') {
      return { status: 'error', messageKey: 'ev.upload.errors.notFound' };
    }
    return { status: 'error', messageKey: 'ev.upload.errors.failed' };
  }
  revalidatePath('/[locale]/experiences/[id]', 'page');
  revalidatePath('/[locale]/experiences/[id]/edit', 'page');
  return { status: 'removed' };
}
