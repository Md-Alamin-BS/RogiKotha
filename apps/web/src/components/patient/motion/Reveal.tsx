import type { ReactNode } from 'react';

type RevealElement = 'ul' | 'ol' | 'div' | 'section';

// FD-091 list reveal (frontend-components.md § 5.2, BR6.2). Children 1–6
// inserted after the first paint fade in and rise, 40 ms apart; all timing is
// in motion.css (`[data-reveal-list]` and `:nth-child`), so no child needs a
// style attribute (BR9.2). Never wrap the demo marker, a disclaimer or the
// emergency guidance in it (BR7.4).
export function Reveal({
  as: Element = 'ul',
  className,
  children,
}: {
  as?: RevealElement | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <Element className={className} data-reveal-list="">
      {children}
    </Element>
  );
}
