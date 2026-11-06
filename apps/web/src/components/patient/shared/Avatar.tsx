// Port of the prototype's generated avatar (ui-design-prototype/shared, avatar() and hash()): rings
// and dots from a hash of the seed text, tinted by the record's hue. Decorative only, never a
// photo and never a signal about the doctor or facility (BR3.8).

// ASSUMPTION(demo-slice): a record without a stored hue gets this neutral blue.
const DEFAULT_HUE = 210;

/** FNV-1a, as in the prototype, so the same seed always draws the same avatar. */
export function avatarHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export function Avatar({
  seed,
  hue,
  size = 96,
}: {
  seed: string;
  hue: number | null | undefined;
  size?: number;
}) {
  const h = avatarHash(seed);
  const base = hue ?? DEFAULT_HUE;
  const c = size / 2;
  const rings = 3 + (h % 3);
  const dots = 4 + (h % 5);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-testid="avatar"
    >
      <circle cx={c} cy={c} r={c - 1} fill={`hsl(${base} 45% 12% / 0.55)`} />
      {Array.from({ length: rings }, (_, i) => {
        // Unsigned shifts: the prototype's signed `>>` gave a negative dash for half of all seeds.
        const dash = 6 + ((h >>> (i * 5)) % 22);
        return (
          <circle
            key={`ring-${i}`}
            cx={c}
            cy={c}
            r={(c * (1 - i / (rings + 0.6))).toFixed(1)}
            fill="none"
            stroke={`hsl(${(base + i * 24) % 360} 70% 58%)`}
            strokeOpacity={(0.85 - i * 0.18).toFixed(2)}
            strokeWidth={2 + (i % 2)}
            strokeDasharray={`${dash} ${(dash / 1.7).toFixed(1)}`}
            transform={`rotate(${(h >>> (i * 3)) % 360} ${c} ${c})`}
          />
        );
      })}
      {Array.from({ length: dots }, (_, j) => {
        const angle = (j / dots) * Math.PI * 2 + (h % 100) / 100;
        const radius = size * 0.3;
        return (
          <circle
            key={`dot-${j}`}
            cx={(c + Math.cos(angle) * radius).toFixed(1)}
            cy={(c + Math.sin(angle) * radius).toFixed(1)}
            r={(1.6 + (j % 3) * 0.9).toFixed(1)}
            fill={`hsl(${(base + 40) % 360} 80% 66%)`}
          />
        );
      })}
    </svg>
  );
}
