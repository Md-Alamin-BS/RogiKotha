// Replaces: `commentHtml`/`replyBox` (discussion thread), app.js. Maps from
// RK.comments (author, body, likes, dangerous, providerFor, mentions).
//
// TODO(T-402): owner refines every field below against the ported
// discussion-ui component; `replies` is one level deep only
// (02-data-model.md §8 `comments.parent_id` — "parent must have parent_id
// null").
export interface CommentVM {
  publicId: string;
  authorLabel: string;
  /** omitted when `tombstone` is true */
  body?: string;
  tombstone: boolean;
  edited: boolean;
  postedAt: string;
  likeCount: number;
  mine: boolean;
  /** set when the author holds an approved claim on the review's doctor */
  providerFor?: string;
  /** derived: hidden_pending_review with an open case reasoning `dangerous` */
  dangerous: boolean;
  replies: CommentVM[];
}

export interface ThreadVM {
  reviewId: string;
  comments: CommentVM[];
}
