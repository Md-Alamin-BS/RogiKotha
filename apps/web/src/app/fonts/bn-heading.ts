import localFont from 'next/font/local';

// Hind Siliguri SemiBold, Bengali subset (FD-091, BR2.4; source and licence in
// docs/status/dependency-check-log.md, 2026-10-29). The one localFont() call:
// [locale]/layout.tsx attaches `variable` to <html> on `bn` only, and the
// `:lang(bn)` heading rules in patient.css read `--font-bn-heading` first, so
// English pages never request the file. The web tests mock next/font/local,
// which only works under Next's build transform.
export const bnHeading = localFont({
  src: './HindSiliguri-SemiBold-bengali.woff2',
  weight: '600',
  style: 'normal',
  display: 'swap',
  preload: false,
  variable: '--font-bn-heading',
  // Next's fallback metrics are computed for Arial or Times, which hold no
  // Bengali glyphs, so the system Bengali stack (patient.css --bangla) is
  // the fallback until the file arrives.
  adjustFontFallback: false,
  fallback: [
    'Noto Sans Bengali',
    'Nirmala UI',
    'Shonar Bangla',
    'Kalpurush',
    'SolaimanLipi',
    'sans-serif',
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC, U+A8F1, U+11DF0-11DF1',
    },
  ],
});
