// @vitest-environment node
// Adversarial tests for the attachment actions. The upload cases of the demo slice (disguised,
// oversized and extra files, strangers, an unreachable scanner) moved with the upload to
// `POST /api/evidence/upload` (route.test.ts, upload.int.test.ts) and the worker (U48 Step 42).
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '@/server/command-call';
import { listOwnEvidenceFiles } from './evidence';

const evidenceModule = vi.hoisted(() => ({ getForAuthor: { name: 'evidence.getForAuthor' } }));

vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: () => ({ evidence: evidenceModule }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const VICTIM_REVIEW_PUBLIC_ID = 'v1ct1mr3v1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe("someone else's experience", () => {
  // The list goes through `evidence.getForAuthor`, whose authorship check is tested in the
  // module (evidence-author.test.ts); here the action may hand it nothing but the review id.
  it("a signed-in stranger cannot list the author's files", async () => {
    vi.mocked(runCommand).mockResolvedValue({
      ok: false,
      error: { code: 'not_found', messageKey: 'errors.common.notFound', correlationId: 'c' },
    } as never);

    await expect(listOwnEvidenceFiles(VICTIM_REVIEW_PUBLIC_ID)).resolves.toBeNull();
    expect(vi.mocked(runCommand).mock.calls).toEqual([
      [evidenceModule.getForAuthor, { reviewPublicId: VICTIM_REVIEW_PUBLIC_ID }],
    ]);
  });
});
