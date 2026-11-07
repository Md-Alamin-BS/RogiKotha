// The Review module's limits (C18, U47 BR1.3, BR1.4, BR2.1, BR2.6). Rate limits are per process,
// like every limiter of release 1.

/** `review.publish` and `facilityReview.publish` share one window (BR1.3). */
export const REVIEW_PUBLISH_LIMIT = 5;
export const REVIEW_PUBLISH_WINDOW_SEC = 24 * 60 * 60;

/** `review.saveDraft` (BR1.4). */
export const REVIEW_DRAFT_SAVE_LIMIT = 300;
export const REVIEW_DRAFT_SAVE_WINDOW_SEC = 60 * 60;

/** Live drafts per account (BR2.6, review R-07). */
export const REVIEW_LIVE_DRAFT_CAP = 10;

/** A draft lives 30 days after its last save (BR2.1). */
export const REVIEW_DRAFT_LIFE_DAYS = 30;
export const REVIEW_DRAFT_LIFE_MS = REVIEW_DRAFT_LIFE_DAYS * 24 * 60 * 60 * 1000;

/** Related lists on the experience page (BR5.8). */
export const RELATED_BY_CONDITION_LIMIT = 6;
export const RELATED_SAME_DOCTOR_LIMIT = 6;
export const RELATED_BY_AUTHOR_LIMIT = 10;

/** The author page and the experiences index (BR7.1, BR7.2). */
export const REVIEW_PAGE_SIZE = 20;

/** The own-review list on `/me` (BR7.3). */
export const OWN_REVIEWS_LIMIT = 100;
