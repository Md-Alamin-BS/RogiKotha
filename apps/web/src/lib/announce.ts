'use client';

import { useCallback } from 'react';

const LIVE_REGION_ID = 'sr-live';
const CLEAR_AFTER_MS = 1000;

// Port of app.js's announce()/renderAll() live-region behaviour
// (STORY-NFR-006), plus a clear-after-1s the prototype's own announce()
// never did (task step 10 asks for it explicitly so repeated identical
// announcements are re-read by a screen reader).
export function useAnnounce() {
  return useCallback((message: string) => {
    const node = document.getElementById(LIVE_REGION_ID);
    if (!node) return;
    node.textContent = message;
    window.setTimeout(() => {
      if (node.textContent === message) {
        node.textContent = '';
      }
    }, CLEAR_AFTER_MS);
  }, []);
}
