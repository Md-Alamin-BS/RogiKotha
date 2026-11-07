// U48 Step 33 smoke: an upload is quarantined and uncounted until the worker's processor finds it
// clean, after which the public count shows it (WF1, WF2, C17). Synthetic data on the fakes.
import { describe, expect, it } from 'vitest';

import { makeEvidenceWorkerWorld } from './evidence-test-support';

describe('evidence smoke', () => {
  it('counts an uploaded PNG once the processor finds it clean', async () => {
    const w = makeEvidenceWorkerWorld();
    const { account, call } = await w.confirmedCall();
    const review = w.addReview(account);
    const count = () => w.evidence.publicEvidenceCount.countPublicEvidence(review.id);

    const { result } = await w.upload(call, { reviewPublicId: review.publicId });
    expect(result.ok && result.data.state).toBe('quarantined');
    expect(await count()).toBe(0);

    const item = [...w.repo.items.values()].find((i) => i.reviewId === review.id)!;
    w.scanner.script.push('clean');
    await w.process(item.id);

    expect(w.repo.item(item.id)?.state).toBe('preview_ready');
    expect(await count()).toBe(1);
  });
});
