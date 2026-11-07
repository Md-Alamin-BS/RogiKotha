// @vitest-environment node
import type { OwnEvidenceList } from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '@/server/command-call';
import { listOwnEvidenceFiles, removeEvidence } from './evidence';

const evidenceModule = vi.hoisted(() => ({
  getForAuthor: { name: 'evidence.getForAuthor' },
  remove: { name: 'evidence.remove' },
}));

vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: () => ({ evidence: evidenceModule }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const REVIEW_PUBLIC_ID = 'r7x2k9m4pq';

beforeEach(() => {
  vi.clearAllMocks();
});

// The list and the removal are thin calls into the Evidence module, which owns the authorship
// check, the status map and the name seal (its own tests cover those, Steps 28-29).
const ITEM_PUBLIC_ID = 'evq7k2m9xa';
const ownList: OwnEvidenceList = {
  reviewPublicId: REVIEW_PUBLIC_ID,
  files: [
    { publicId: ITEM_PUBLIC_ID, name: 'xray.png', status: 'ready', size: 2048 },
    {
      publicId: 'evq7k2m9xb',
      name: null,
      status: 'failed',
      size: 4096,
      reasonKey: 'ev.reason.couldNotCheck',
    },
  ],
  maxFiles: 10,
  maxBytes: 15_728_640,
};

function refusal(code: string) {
  return { ok: false as const, error: { code, messageKey: 'x', correlationId: 'c' } } as never;
}

describe("listing the author's own attachments", () => {
  it("answers the module's list for the author", async () => {
    vi.mocked(runCommand).mockResolvedValue({ ok: true, data: ownList } as never);

    await expect(listOwnEvidenceFiles(REVIEW_PUBLIC_ID)).resolves.toEqual(ownList);
    expect(runCommand).toHaveBeenCalledWith(evidenceModule.getForAuthor, {
      reviewPublicId: REVIEW_PUBLIC_ID,
    });
  });

  it("is null for a non-author's review, which the module answers as null", async () => {
    vi.mocked(runCommand).mockResolvedValue({ ok: true, data: null } as never);

    await expect(listOwnEvidenceFiles(REVIEW_PUBLIC_ID)).resolves.toBeNull();
  });

  it.each(['forbidden', 'auth.email_unverified', 'validation', 'internal'])(
    'is null when the module answers %s',
    async (code) => {
      vi.mocked(runCommand).mockResolvedValue(refusal(code));

      await expect(listOwnEvidenceFiles('not-an-id')).resolves.toBeNull();
    },
  );
});

describe('removing one of the author’s attachments (WF4, BR6.3)', () => {
  it('removes through the module and refreshes the experience pages', async () => {
    vi.mocked(runCommand).mockResolvedValue({ ok: true, data: {} } as never);

    await expect(removeEvidence(ITEM_PUBLIC_ID)).resolves.toEqual({ status: 'removed' });
    expect(runCommand).toHaveBeenCalledWith(evidenceModule.remove, {
      itemPublicId: ITEM_PUBLIC_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]/experiences/[id]', 'page');
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]/experiences/[id]/edit', 'page');
  });

  it.each([
    ['not_found', 'ev.upload.errors.notFound'],
    ['validation', 'ev.upload.errors.notFound'],
    ['forbidden', 'ev.upload.errors.signedOut'],
    ['internal', 'ev.upload.errors.failed'],
  ])('maps %s to %s and refreshes nothing', async (code, messageKey) => {
    vi.mocked(runCommand).mockResolvedValue(refusal(code));

    await expect(removeEvidence(ITEM_PUBLIC_ID)).resolves.toEqual({ status: 'error', messageKey });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
