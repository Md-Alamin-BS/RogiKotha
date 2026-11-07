// The Community module's audit builders (01-conventions §5, BR1.7, BR2.4): the actor is the author
// persona, never the account, and details hold booleans only.
import { assertAuditDetails } from '../../audit/allowlist';
import type { AuditEntry } from '../../ports';

export const COMMUNITY_AUDIT_DETAIL_KEYS = {
  commentPosted: ['isReply'],
  commentDeleted: ['tombstone'],
} as const;

export const communityAudit = {
  commentPosted(commentId: string, personaId: string, details: { isReply: boolean }): AuditEntry {
    assertAuditDetails(details, COMMUNITY_AUDIT_DETAIL_KEYS.commentPosted);
    return {
      stream: `comment:${commentId}`,
      action: 'comment.posted',
      actor: `persona:${personaId}`,
      targetKind: 'comment',
      targetId: commentId,
      details,
    };
  },
  commentDeleted(
    commentId: string,
    personaId: string,
    details: { tombstone: boolean },
  ): AuditEntry {
    assertAuditDetails(details, COMMUNITY_AUDIT_DETAIL_KEYS.commentDeleted);
    return {
      stream: `comment:${commentId}`,
      action: 'comment.deleted',
      actor: `persona:${personaId}`,
      targetKind: 'comment',
      targetId: commentId,
      details,
    };
  },
};
