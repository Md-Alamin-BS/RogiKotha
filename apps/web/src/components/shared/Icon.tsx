import type { ReactNode } from 'react';

// Port of admin/app.js's ICONS + icon() (lines ~123-133).
export type IconName = 'inbox' | 'shield' | 'idcard' | 'bell' | 'sliders' | 'person';

const PATHS: Record<IconName, ReactNode> = {
  inbox: (
    <>
      <path d="M4 13h4l1.6 2.6h4.8L16 13h4" />
      <path d="M6 4h12l3 9v7H3v-7z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19 6v5.8c0 4-2.8 7-7 9-4.2-2-7-5-7-9V6z" />
      <path d="m9 12 2.2 2.2L15.4 10" />
    </>
  ),
  idcard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="2" />
      <path d="M14 10h4M14 14h4M6.2 16.2c.9-1.8 4.7-1.8 5.6 0" />
    </>
  ),
  bell: (
    <>
      <path d="M18.5 16.5V11a6.5 6.5 0 1 0-13 0v5.5L4 18.5h16z" />
      <path d="M10 21.5h4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7.5h9M17.5 7.5H20M4 16.5h3.5M12 16.5h8" />
      <circle cx="15" cy="7.5" r="2.4" />
      <circle cx="9.5" cy="16.5" r="2.4" />
    </>
  ),
  // ASSUMPTION(T-008): the prototype's masthead sign-in control is an empty
  // `<span></span>` (ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html
  // line 56) — no "person" glyph exists to port. This path is new, matching
  // the prototype ICONS' own style (24x24 viewBox, stroke-only, two shapes).
  person: (
    <>
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5 20c1.4-4.2 4.3-6.4 7-6.4s5.6 2.2 7 6.4" />
    </>
  ),
};

export function Icon({ name, className = 'ico' }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
