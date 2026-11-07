// The uploaded file name is private to its author (BR2.6): only its last path segment is kept, and it
// is sealed before storage by the caller.

export const EVIDENCE_FILENAME_MAX_CHARS = 200;

/** The last path segment on `/` or `\`, without control characters, trimmed, at most 200 characters. */
export function cleanFilename(raw: string): string | null {
  const segments = raw.split(/[/\\]/);
  const last = segments[segments.length - 1] ?? '';
  const visible = last.replace(/\p{Cc}/gu, '').trim();
  // Cut by code point, so a Bengali or emoji name never ends in half a surrogate pair.
  const cut = Array.from(visible).slice(0, EVIDENCE_FILENAME_MAX_CHARS).join('').trim();
  return cut === '' ? null : cut;
}
