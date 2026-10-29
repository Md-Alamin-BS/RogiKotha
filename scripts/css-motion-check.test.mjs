import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

import { formatFinding, scan } from './css-motion-check.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workDir = mkdtempSync(path.join(tmpdir(), 'rk-motion-'));

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const DARK_TOKENS = `
  --paper: hsl(30 12% 9%);
  --ink: hsl(40 25% 93%);
  --focus: hsl(214 90% 70%);
`;

// A patient stylesheet that obeys every rule: both dark blocks, a Bengali reset beside each Latin
// rule that uppercases or tracks, and no motion declaration of its own.
const patientCss = ({ explicitDark = DARK_TOKENS, extra = '' } = {}) => `
:root {
  --paper: hsl(40 33% 95%);
  --ink: hsl(194 23% 15%);
  --focus: hsl(218 78% 47%);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {${DARK_TOKENS}  }
}

:root[data-theme="dark"] {${explicitDark}}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
html:lang(bn) .kicker {
  text-transform: none;
  letter-spacing: 0;
}

.brand b {
  letter-spacing: -0.03em;
}
.brand b:lang(bn) {
  letter-spacing: 0;
}

.card:hover {
  border-color: var(--ink);
}
${extra}`;

// A motion stylesheet that obeys every rule.
const motionCss = ({ extra = '' } = {}) => `
:root {
  --dur-fast: 160ms;
  --dur-base: 240ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --rise: 12px;
  --stagger: 40ms;
  --press-scale: 0.98;
}

.demo,
.demo * {
  animation: none !important;
  transition: none !important;
}

.demo {
  view-transition-name: demo;
}

:root[data-motion-ready] .overlay {
  transition: opacity var(--dur-fast) var(--ease-out);
}

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion="reduced"])::view-transition-new(page) {
    animation: rk-page-in var(--dur-base) var(--ease-out) both;
  }

  :root:not([data-motion="reduced"])[data-motion-ready] [data-reveal-list] > :nth-child(2) {
    transition:
      opacity var(--dur-base) var(--ease-out),
      transform var(--dur-base) var(--ease-out);
    transition-delay: var(--stagger);
  }

  :root:not([data-motion="reduced"]) :where(.btn):where(:not(.demo *, .emerg-card)):active {
    transform: scale(var(--press-scale));
  }

  @keyframes rk-page-in {
    from {
      opacity: 0;
      transform: translateY(var(--rise));
    }
  }
}
${extra}`;

const clean = () => [
  { name: 'patient.css', text: patientCss() },
  { name: 'motion.css', text: motionCss() },
];

const withPatient = (options) => [
  { name: 'patient.css', text: patientCss(options) },
  { name: 'motion.css', text: motionCss() },
];

const withMotion = (extra) => [
  { name: 'patient.css', text: patientCss() },
  { name: 'motion.css', text: motionCss({ extra }) },
];

const codes = (findings) => findings.map((finding) => finding.code);

describe('the clean stylesheets', () => {
  it('pass every rule', () => {
    expect(scan(clean())).toEqual([]);
  });

  it('pass when the guard selector uses single quotes and the transition is written in one line', () => {
    const files = withMotion(`
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion='reduced']) .sheet { transition: opacity var(--dur-base), transform var(--dur-base); }
}
`);

    expect(scan(files)).toEqual([]);
  });

  it('accept a Bengali reset written as html:lang(bn) over an :is() group', () => {
    const files = withPatient({
      extra: `
.a,
.b {
  letter-spacing: 0.1em;
}
html:lang(bn) :is(.a, .b) {
  letter-spacing: 0;
}
`,
    });

    expect(scan(files)).toEqual([]);
  });
});

describe('M1-property', () => {
  it.each([
    ['a width transition', '.x { transition: width var(--dur-base); }'],
    ['transition: all', '.x { transition: all var(--dur-base); }'],
    ['a transition with no property', '.x { transition: var(--dur-base) var(--ease-out); }'],
    ['a transition-property of color', '.x { transition-property: color; }'],
    [
      'a Prettier-formatted multi-line list with one bad property',
      '.x {\n  transition:\n    opacity var(--dur-base) var(--ease-out),\n    background-color var(--dur-base) var(--ease-out);\n}',
    ],
  ])('fails %s', (_label, rule) => {
    const findings = scan(withMotion(rule));

    expect(codes(findings)).toContain('M1-property');
  });

  it('fails a keyframe that animates a layout property', () => {
    const findings = scan(
      withMotion(
        '@media (prefers-reduced-motion: no-preference) { @keyframes grow { to { width: 100%; } } }',
      ),
    );

    expect(codes(findings)).toEqual(['M1-property']);
  });

  it('reports the first line of a multi-line value', () => {
    const extra =
      '\n.x {\n  transition:\n    opacity var(--dur-base),\n    color var(--dur-base);\n}\n';
    const text = motionCss({ extra });
    const [finding] = scan([{ name: 'motion.css', text }]).filter((f) => f.code === 'M1-property');

    expect(text.split('\n')[finding.line - 1]).toContain('transition:');
  });
});

describe('M2-duration', () => {
  it.each([
    ['a literal transition time', '.x { transition: opacity 200ms; }'],
    ['a literal animation duration', '.x { animation: rk-page-in 0.3s; }'],
    ['a literal delay', '.x { transition-delay: 1s; }'],
    ['a literal inside calc()', '.x { transition-delay: calc(var(--stagger) + 100ms); }'],
  ])('fails %s', (_label, rule) => {
    expect(codes(scan(withMotion(rule)))).toContain('M2-duration');
  });

  it('allows a time that is a token definition', () => {
    expect(scan(withMotion(':root { --dur-slow: 360ms; }'))).toEqual([]);
  });
});

describe('M3-iteration', () => {
  it.each([
    ['infinite', '.x { animation: rk-page-in var(--dur-base) infinite; }'],
    ['an iteration count of 3', '.x { animation-iteration-count: 3; }'],
    ['an iteration count of 2 in the shorthand', '.x { animation: rk-page-in var(--dur-base) 2; }'],
    ['alternate', '.x { animation-direction: alternate; }'],
  ])('fails %s', (_label, rule) => {
    expect(codes(scan(withMotion(rule)))).toContain('M3-iteration');
  });

  it('allows an iteration count of 1', () => {
    expect(scan(withMotion('.x { animation-iteration-count: 1; }'))).toEqual([]);
  });
});

describe('M4-scale', () => {
  it.each([
    ['0.9', '.x { transform: scale(0.9); }'],
    ['1.1', '.x { transform: scale(1.1); }'],
    [
      'a token that holds 0.5',
      ':root { --squeeze: 0.5; } .x { transform: scale(var(--squeeze)); }',
    ],
    ['the scale property', '.x { scale: 0.5; }'],
    [
      'an axis scale in a keyframe',
      '@media (prefers-reduced-motion: no-preference) { @keyframes grow { from { transform: scaleX(0); } } }',
    ],
  ])('fails scale(%s)', (_label, rule) => {
    expect(codes(scan(withMotion(rule)))).toContain('M4-scale');
  });

  it('allows 0.98, 1.02 and a token inside the band', () => {
    const rule = '.x { transform: scale(0.98); } .y { transform: scale(1.02); }';

    expect(scan(withMotion(rule))).toEqual([]);
  });

  it('reads a leading-zero-less number', () => {
    expect(codes(scan(withMotion('.x { transform: scale(.5); }')))).toContain('M4-scale');
  });
});

describe('M5-guard', () => {
  it.each([
    [
      'a transform transition outside the media query',
      '.x { transition: transform var(--dur-base); }',
    ],
    [
      'a transform transition inside the media query without the selector',
      '@media (prefers-reduced-motion: no-preference) { .x { transition: transform var(--dur-base); } }',
    ],
    [
      'a transform transition under the reduce media query',
      '@media (prefers-reduced-motion: reduce) { :root:not([data-motion="reduced"]) .x { transition: transform var(--dur-base); } }',
    ],
    [
      'a view-transition animation outside the guard',
      '::view-transition-old(page) { animation: rk-page-in var(--dur-base); }',
    ],
    [
      'a keyframe that moves outside the guard',
      '@keyframes slide { to { transform: translateX(8px); } }',
    ],
    [
      'a scroll animation that moves, outside the guard',
      '@supports (animation-timeline: view()) { .reveal { animation: rk-page-in linear both; } }',
    ],
  ])('fails %s', (_label, rule) => {
    expect(codes(scan(withMotion(rule)))).toContain('M5-guard');
  });

  it('does not need a selector for a keyframe inside the guard', () => {
    const rule =
      '@media (prefers-reduced-motion: no-preference) { @keyframes slide { to { transform: translateX(8px); } } }';

    expect(scan(withMotion(rule))).toEqual([]);
  });

  it('allows an opacity-only transition outside the guard', () => {
    expect(scan(withMotion('.sheet { transition: opacity var(--dur-fast); }'))).toEqual([]);
  });
});

describe('M6-file', () => {
  it.each([
    ['a transition', '.x { transition: opacity var(--dur-fast); }'],
    ['a transition: none', '.x { transition: none; }'],
    ['an animation', '.x { animation: rk-page-in var(--dur-base); }'],
    ['a keyframes block', '@keyframes fade { to { opacity: 0; } }'],
    ['a view-transition name', '.x { view-transition-name: page; }'],
    ['a view-transition pseudo-element', '::view-transition-old(page) { opacity: 0; }'],
  ])('fails %s in patient.css', (_label, extra) => {
    const findings = scan(withPatient({ extra }));

    expect(codes(findings)).toContain('M6-file');
    expect(findings.every((finding) => finding.file === 'patient.css')).toBe(true);
  });

  it('allows a static transform in patient.css', () => {
    expect(scan(withPatient({ extra: '.bar { transform: scaleX(var(--w, 0)); }' }))).toEqual([]);
  });
});

describe('M7-static', () => {
  it.each([
    '.demo',
    '.colophon',
    '.emergency-lines a',
    '.emerg-card',
    '#view-emergency',
    '[data-static] p',
  ])('fails a motion rule that selects %s', (selector) => {
    const rule = `@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="reduced"]) ${selector} { transition: opacity var(--dur-base); } }`;

    expect(codes(scan(withMotion(rule)))).toContain('M7-static');
  });

  it('reads [data-static written with either quote style', () => {
    const rule = `[data-static='emergency'] { animation: rk-page-in var(--dur-base); }`;

    expect(codes(scan(withMotion(rule)))).toContain('M7-static');
  });

  it('allows the static block and a name that sits inside :not()', () => {
    expect(scan(clean())).toEqual([]);
  });
});

describe('M8-bangla', () => {
  it.each([
    ['uppercase', '.tag { text-transform: uppercase; }'],
    ['positive letter-spacing', '.tag { letter-spacing: 0.12em; }'],
    ['negative letter-spacing', '.tag { letter-spacing: -0.02em; }'],
  ])('fails %s with no Bengali reset', (_label, extra) => {
    const findings = scan(withPatient({ extra }));

    expect(codes(findings)).toEqual(['M8-bangla']);
  });

  it('fails when the reset covers the spacing but not the uppercase', () => {
    const extra =
      '.tag { text-transform: uppercase; letter-spacing: 0.1em; }\nhtml:lang(bn) .tag { letter-spacing: 0; }';

    expect(codes(scan(withPatient({ extra })))).toEqual(['M8-bangla']);
  });

  it('fails when the reset answers a different selector', () => {
    const extra = '.tag { letter-spacing: 0.1em; }\nhtml:lang(bn) .other { letter-spacing: 0; }';

    expect(codes(scan(withPatient({ extra })))).toEqual(['M8-bangla']);
  });

  it('accepts both reset forms', () => {
    const extra =
      '.a { letter-spacing: 0.1em; }\nhtml:lang(bn) .a { letter-spacing: 0; }\n.b { letter-spacing: 0.1em; }\n.b:lang(bn) { letter-spacing: 0; }';

    expect(scan(withPatient({ extra }))).toEqual([]);
  });
});

describe('M9-hover', () => {
  it.each([
    ['transform', '.card:hover { transform: translateY(-2px); }'],
    ['translate', '.card:hover { translate: 0 -2px; }'],
    ['scale', '.card:hover { scale: 1.02; }'],
    ['rotate', '.card:hover { rotate: 2deg; }'],
    ['a pseudo-element', '.tabs a:hover::after { transform: scaleX(0.4); }'],
    ['a selector list', '.a:hover, .b:hover { transform: none; }'],
  ])('fails %s in a :hover rule', (_label, extra) => {
    expect(codes(scan(withPatient({ extra })))).toContain('M9-hover');
  });

  it('allows a colour change on hover', () => {
    expect(scan(clean())).toEqual([]);
  });
});

describe('M10-tokens', () => {
  it('fails when a dark value differs between the two blocks', () => {
    const explicitDark = DARK_TOKENS.replace('hsl(30 12% 9%)', 'hsl(30 12% 10%)');
    const findings = scan(withPatient({ explicitDark }));

    expect(codes(findings)).toEqual(['M10-tokens']);
    expect(findings[0].reason).toContain('--paper differs');
  });

  it('fails when a dark token is missing from the explicit block', () => {
    const explicitDark = DARK_TOKENS.replace('  --focus: hsl(214 90% 70%);\n', '');
    const findings = scan(withPatient({ explicitDark }));

    expect(codes(findings)).toEqual(['M10-tokens']);
    expect(findings[0].reason).toContain('--focus');
  });

  it('fails when the explicit block has a token the media block lacks', () => {
    const explicitDark = `${DARK_TOKENS}  --extra: hsl(0 0% 0%);\n`;

    expect(scan(withPatient({ explicitDark })).map((f) => f.reason)).toEqual([
      expect.stringContaining('--extra'),
    ]);
  });

  it('fails on a second column-0 dark block', () => {
    const extra = ':root[data-theme="dark"] {\n  --ink: hsl(0 0% 100%);\n}\n';
    const findings = scan(withPatient({ extra }));

    expect(codes(findings)).toEqual(['M10-tokens']);
    expect(findings[0].reason).toContain('2 column-0');
  });

  it('fails when there is no column-0 dark block', () => {
    const text = patientCss().replace(/:root\[data-theme="dark"\] \{[^}]*\}/, '');

    expect(codes(scan([{ name: 'patient.css', text }]))).toEqual(['M10-tokens']);
  });

  it('fails on a column-0 scheme block', () => {
    const extra = ':root[data-scheme="forest"] {\n  --ink: hsl(0 0% 0%);\n}\n';

    expect(codes(scan(withPatient({ extra })))).toEqual(['M10-tokens']);
  });

  it('fails when the media-query dark block is missing', () => {
    const text = patientCss().replace(/@media \(prefers-color-scheme: dark\) \{[\s\S]*?\n\}\n/, '');

    expect(codes(scan([{ name: 'patient.css', text }]))).toEqual(['M10-tokens']);
  });

  it('accepts a nested dark rule that continues the selector', () => {
    const extra = ':root[data-theme="dark"] .card {\n  box-shadow: none;\n}\n';

    expect(scan(withPatient({ extra }))).toEqual([]);
  });

  it('ignores a dark block that is commented out', () => {
    const extra = '/*\n:root[data-theme="dark"] {\n  --ink: red;\n}\n*/\n';

    expect(scan(withPatient({ extra }))).toEqual([]);
  });

  it('is not applied to motion.css', () => {
    expect(scan([{ name: 'motion.css', text: motionCss() }])).toEqual([]);
  });
});

describe('M11-vt-name', () => {
  it.each(['sidebar', 'root'])('fails view-transition-name: %s', (name) => {
    const findings = scan(withMotion(`.x { view-transition-name: ${name}; }`));

    expect(codes(findings)).toEqual(['M11-vt-name']);
  });

  it.each(['page', 'masthead', 'demo', 'colophon', 'emergency', 'disclaimer', 'none'])(
    'allows view-transition-name: %s',
    (name) => {
      expect(scan(withMotion(`.x { view-transition-name: ${name}; }`))).toEqual([]);
    },
  );
});

describe('the scanner', () => {
  it('fails closed on an unclosed block', () => {
    const findings = scan(withMotion('.x { transition: opacity var(--dur-base);'));

    expect(codes(findings)).toContain('M0-parse');
  });

  it('fails closed on an unmatched closing brace', () => {
    expect(codes(scan(withMotion('}')))).toContain('M0-parse');
  });

  it('ignores braces and semicolons inside strings, url() and comments', () => {
    const extra = `
.x { content: "};{"; background: url("data:image/svg+xml;utf8,<svg/>"); }
/* .y { transition: width 1s; } */
`;

    expect(scan(withMotion(extra))).toEqual([]);
  });

  it('formats a finding as file:line  code  reason', () => {
    const [finding] = scan(withMotion('.x { transition: width var(--dur-base); }'));

    expect(formatFinding(finding)).toMatch(
      /^motion\.css:\d+ {2}M1-property {2}transition of width/,
    );
  });
});

describe('the command', () => {
  const run = (...files) =>
    spawnSync(process.execPath, ['scripts/css-motion-check.mjs', ...files], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
  const write = (name, text) => {
    const file = path.join(workDir, name);
    writeFileSync(file, text);
    return file;
  };

  it('exits 0 and says OK for clean stylesheets', () => {
    const result = run(write('patient.css', patientCss()), write('motion.css', motionCss()));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('OK');
  });

  it('exits 1 and prints file, line and reason for transition: width', () => {
    const file = write(
      'motion.css',
      motionCss({ extra: '.x { transition: width var(--dur-base); }' }),
    );
    const result = run(file);

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/motion\.css:\d+ {2}M1-property/);
  });

  it('exits 1 when a stylesheet cannot be read', () => {
    const result = run(path.join(workDir, 'missing.css'));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('cannot read');
  });
});
