// BR2.3: a comment deleted while it has live replies leaves a placeholder.

/** Throws a programmer error for a count that is not a non-negative integer. */
export function tombstoneOnDelete(liveReplies: number): boolean {
  if (!Number.isInteger(liveReplies) || liveReplies < 0) {
    throw new Error('tombstoneOnDelete: liveReplies must be a non-negative integer');
  }
  return liveReplies > 0;
}
