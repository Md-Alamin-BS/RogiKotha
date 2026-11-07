// `evidence.admitUpload` (BR1.1, BR2.7): one rate-limit hit per upload request, before the route
// reads the body. Every request counts, refused ones too; nothing is written.
import { AdmitUploadInput, err, ok } from '@rogikotha/contracts';
import { EVIDENCE_UPLOAD_LIMIT, EVIDENCE_UPLOAD_WINDOW_SEC } from '@rogikotha/domain';

import { defineCommand } from '../../../command';
import { accountIdOf } from '../access';
import type { EvidenceModuleDeps } from '../ports';

export function admitUploadCommand(deps: EvidenceModuleDeps) {
  return defineCommand<AdmitUploadInput, Record<string, never>>({
    name: 'evidence.admitUpload',
    input: AdmitUploadInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ actor }) {
      const decision = await deps.rateLimiter.hit(
        `evidence.upload:account:${accountIdOf(actor)}`,
        EVIDENCE_UPLOAD_LIMIT,
        EVIDENCE_UPLOAD_WINDOW_SEC,
      );
      if (decision.allowed) return ok({});
      return err('evidence.rate_limited', {
        correlationId: actor.correlationId,
        retryAfterSec: decision.retryAfter ?? EVIDENCE_UPLOAD_WINDOW_SEC,
      });
    },
  });
}
