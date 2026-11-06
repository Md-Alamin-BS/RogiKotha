import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

// The last resort for a URL outside any locale (for example `/fr/x` after the proxy): it renders
// outside the `[locale]` layout, with no request locale and no provider, so it reads both
// dictionaries by an explicit locale and marks each line with its own `lang` (BR4.2, ISS-120).
// Deliberately imports no stylesheet: this boundary stays self-contained.
export default async function NotFound() {
  const [en, bn] = await Promise.all([
    getTranslations({ locale: 'en' }),
    getTranslations({ locale: 'bn' }),
  ]);

  return (
    <html lang="en">
      <body>
        <main>
          <p lang="en">
            {en('notFound.body')} <Link href="/en">{en('notFound.home')}</Link>
          </p>
          <p lang="bn">
            {bn('notFound.body')} <Link href="/bn">{bn('notFound.home')}</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
