import type { ReactNode } from 'react';

// next-intl requires the [locale] layout to own <html>/<body> (it needs the
// route's locale param to set `lang`); this root layout is a pass-through
// (task step 5, and the next-intl app-router-with-i18n-routing pattern).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
