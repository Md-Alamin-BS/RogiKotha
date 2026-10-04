// STORY-NFR-006: aria-live region for view/lang/theme announcements
// (app.js `announce()`). Rendered exactly once, in [locale]/layout.tsx.
export function LiveRegion() {
  return <div id="sr-live" className="sr-only" aria-live="polite" role="status" />;
}
