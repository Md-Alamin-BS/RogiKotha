import Link from 'next/link';

// Root `app/not-found.tsx` handles every URL that matches no route at all
// (Next.js docs, "not-found.js" — true since v13.3.0), which for this app
// includes an unrecognised locale segment (`/fr`) after next-intl's proxy
// redirects it into a `[locale]` slot that still fails to match any page.
// That means this file renders OUTSIDE the `[locale]` layout tree — no
// request locale, no NextIntlClientProvider — so it cannot call
// `useTranslations()`. ASSUMPTION(T-008): the two lines below are the only
// hard-coded user-facing strings in this app (01-conventions.md §8 asks for
// none); they mirror `results.none`'s current en/bn copy verbatim so they
// stay in sync manually rather than drift — see ISS list in the T-008
// hand-off. Deliberately does not import the ported stylesheets: this
// boundary must stay self-contained (Next.js docs on composing a 404 for a
// root layout with a top-level dynamic segment).
export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            padding: '3rem 1.25rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <p>
            Nothing matched yet. <Link href="/en">Go home</Link>
          </p>
          <p lang="bn">
            এখনো কিছু মেলেনি। <Link href="/bn">হোমে যান</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
