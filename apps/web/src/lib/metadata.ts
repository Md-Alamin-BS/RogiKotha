import type { Metadata } from 'next';

// 01-conventions.md §8: /authors/*, all /me/*, all /admin/*, and auth pages
// carry `robots: { index: false }` (T-502 additionally sends
// `X-Robots-Tag: noindex` headers for those prefixes — both stay).
export function noindex(): Pick<Metadata, 'robots'> {
  return { robots: { index: false } };
}
