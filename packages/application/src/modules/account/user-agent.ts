// Browser and OS families for the session list (T-101 BR4.7, T-102 Q10 A). Family names only, each
// null when unknown, so T-102 builds the label from a key in the page's language. The user agent
// itself is never returned, stored elsewhere or logged.

const BROWSERS: readonly (readonly [RegExp, string])[] = [
  [/\bEdg(?:e|A|iOS)?\//, 'Edge'],
  [/\b(?:Firefox|FxiOS)\//, 'Firefox'],
  [/\b(?:Chrome|CriOS)\//, 'Chrome'],
  [/\bVersion\/[\d.]+.*\bSafari\//, 'Safari'],
];

const SYSTEMS: readonly (readonly [RegExp, string])[] = [
  [/\bWindows\b/, 'Windows'],
  [/\bAndroid\b/, 'Android'],
  [/\b(?:iPhone|iPad|iPod)\b/, 'iOS'],
  [/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
  [/\bLinux\b/, 'Linux'],
];

function firstMatch(table: readonly (readonly [RegExp, string])[], userAgent: string | null) {
  if (!userAgent) return null;
  return table.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

export function browserFamily(userAgent: string | null): string | null {
  return firstMatch(BROWSERS, userAgent);
}

export function osFamily(userAgent: string | null): string | null {
  return firstMatch(SYSTEMS, userAgent);
}
