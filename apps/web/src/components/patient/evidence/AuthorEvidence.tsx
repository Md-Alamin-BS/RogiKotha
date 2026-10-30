import { listOwnEvidenceFiles } from '@/server/actions/evidence';

import { EvidenceUploader } from './EvidenceUploader';

/**
 * The uploader for the signed-in author of the experience; renders nothing for anyone else, so
 * pages can place it unconditionally (server component).
 */
export async function AuthorEvidence({ reviewPublicId }: { reviewPublicId: string }) {
  const list = await listOwnEvidenceFiles(reviewPublicId);
  if (!list) return null;
  return <EvidenceUploader {...list} />;
}
