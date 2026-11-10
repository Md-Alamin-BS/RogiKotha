// Replaces: `renderPerson` (`/authors/{username}`, noindex), app.js. Maps
// from the pseudonymous persona's public projection plus that account's
// published reviews — an allowlisted projection, never account id, email,
// or private identity linkage (01-conventions.md §5).
//
// Release 2 (T-409): owner refines every field below against the ported
// component.
export interface PublicProfileReviewRefVM {
  publicId: string;
  title: string;
  doctorName: string;
  postedAt: string;
}

export interface PublicProfileVM {
  username: string;
  displayName: string;
  joinedAt: string;
  publishedCount: number;
  recentReviews: PublicProfileReviewRefVM[];
}
