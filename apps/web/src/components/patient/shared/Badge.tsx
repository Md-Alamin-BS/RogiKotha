import type { ReactNode } from 'react';

export type BadgeClass = 'warn' | 'plain' | 'positive' | 'mixed' | 'negative' | 'good' | 'poor';

export function Badge({
  cls,
  children,
  title,
  testId,
}: {
  cls: BadgeClass;
  children: ReactNode;
  title?: string | undefined;
  testId?: string | undefined;
}) {
  return (
    <span className={`badge ${cls}`} title={title} data-testid={testId}>
      {children}
    </span>
  );
}
