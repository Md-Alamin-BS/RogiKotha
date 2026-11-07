'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { PublishTick } from '@/components/patient/motion/PublishTick';
import { useAnnounce } from '@/lib/announce';
import { EXPERIENCE_TITLE_ID } from './ExperienceBody';

// The confirmation after a publish (BR8.7): one tick beside the plain sentence, announced once,
// then focus on the page title. No confetti and no count.
export function PublishedNote() {
  const t = useTranslations();
  const announce = useAnnounce();
  const message = t('compose.publishedNote');
  const announced = useRef(false);

  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    announce(message);
    document.getElementById(EXPERIENCE_TITLE_ID)?.focus();
  }, [announce, message]);

  return (
    <div className="callout published-note" data-testid="published-note">
      <PublishTick>{message}</PublishTick>
    </div>
  );
}
