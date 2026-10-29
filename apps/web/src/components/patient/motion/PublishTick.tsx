import type { ReactNode } from 'react';

// Stroke width and the two arms of the tick, in the 24-unit view box. Each arm
// is a horizontal stroke inside its own clipped window (a nested <svg>), turned
// into place; motion.css slides the stroke out of the window's start edge, so
// the tick draws by transform alone (BR4.2) without a scale below 0.98 (BR4.3).
const STROKE = 2.5;
const HALF = STROKE / 2;
const SHORT_ARM = { x: 6, y: 12.5, length: 6.36, angle: 45 };
const LONG_ARM = { x: 10.5, y: 17, length: 12.42, angle: -49.9 };

function Arm({ arm, className }: { arm: typeof SHORT_ARM; className: string }) {
  return (
    <g transform={`translate(${arm.x} ${arm.y}) rotate(${arm.angle})`}>
      <svg x={-HALF} y={-HALF} width={arm.length + STROKE} height={STROKE} overflow="hidden">
        <path className={className} d={`M${HALF} ${HALF}H${arm.length + HALF}`} />
      </svg>
    </g>
  );
}

// FD-091 publish confirmation (frontend-components.md § 5.3, BR6.4, BR8.1): one
// tick beside the caller's plain-text confirmation. The tick is decorative; the
// text carries the meaning, and the caller announces it through the existing
// live region, so this adds none. A tick already on the page at the first paint
// is shown complete (BR4.5).
export function PublishTick({ children }: { children: ReactNode }) {
  return (
    <span className="publish-tick">
      <svg
        className="publish-tick-mark"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      >
        <Arm arm={SHORT_ARM} className="publish-tick-arm" />
        <Arm arm={LONG_ARM} className="publish-tick-arm publish-tick-arm-long" />
      </svg>
      {children}
    </span>
  );
}
