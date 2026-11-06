// C17: the only way a directory, taxonomy or review read learns how many public documents a review
// has (U46 BR1.5). Declared by U46; U48's Evidence module implements it. Frozen at U46's merge.

export interface PublicEvidenceCount {
  /** Documents of one review that the public may count. */
  countPublicEvidence(reviewId: string): Promise<number>;
  /** The same for many reviews at once; a review missing from the map has 0 (Question 8). */
  countPublicEvidenceByReview(reviewIds: readonly string[]): Promise<ReadonlyMap<string, number>>;
}
