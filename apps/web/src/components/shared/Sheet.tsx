'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Port of the prototype's `.overlay > .sheet[role=dialog]` (index.html) plus
// trapFocus/releaseFocusTrap/openSheet/closeSheet (app.js ~2826-2854).
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  const t = useTranslations();
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    triggerRef.current = document.activeElement;
    closeRef.current?.focus();

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const container = sheetRef.current;
      if (!container) return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      // Improvement over the prototype (which never returned focus): return
      // it to whatever triggered the sheet, per task step 11.
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open, onClose]);

  return (
    <div className="overlay" hidden={!open}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={sheetRef}>
        <header className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="sheet-close"
            ref={closeRef}
            aria-label={t('a11y.close')}
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
