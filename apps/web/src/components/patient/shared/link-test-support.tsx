// Test-only stand-in for the app's routing `Link` (see components/patient/Masthead.test.tsx for why
// the module is mocked): a plain anchor, without next/link's own props.
import type { ReactNode } from 'react';

export function PlainLink({
  href,
  children,
  scroll: _scroll,
  prefetch: _prefetch,
  ...rest
}: {
  href: string;
  children?: ReactNode;
  scroll?: boolean;
  prefetch?: boolean;
}) {
  void _scroll;
  void _prefetch;
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
