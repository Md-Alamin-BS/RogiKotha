'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import type { ComposerStep } from './composer-reducer';

// The width at which `.c-grid` stacks (patient.css), so the aside follows the form.
const NARROW_QUERY = '(max-width: 1040px)';

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(NARROW_QUERY);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return narrow;
}

// The preview next to the form (BR8.5). On a wide screen it is the sticky aside; once the layout
// stacks (360 px phones) it follows the form inside a `details`, closed except on step 4 where the
// author checks it. It never holds the disclaimer. `children` is the rendered preview
// (ExperienceBody or the facility row); without it the aside says the preview is still empty.
export function PreviewAside({ step, children }: { step: ComposerStep; children?: ReactNode }) {
  const t = useTranslations();
  const narrow = useNarrow();
  const [open, setOpen] = useState(step === 4);

  // The author's own toggle holds until the step changes again.
  useEffect(() => {
    setOpen(step === 4);
  }, [step]);

  const card = (
    <section className="panel preview-card" data-testid="compose-preview">
      {narrow ? null : <span className="k">{t('compose.preview')}</span>}
      {children ?? <p className="note">{t('compose.previewEmpty')}</p>}
    </section>
  );

  return (
    <aside className="c-side" data-testid="compose-aside">
      {narrow ? (
        <details
          className="preview-details"
          open={open}
          onToggle={(e) => setOpen(e.currentTarget.open)}
          data-testid="compose-preview-details"
        >
          <summary>{t('compose.preview')}</summary>
          {card}
        </details>
      ) : (
        card
      )}
    </aside>
  );
}
