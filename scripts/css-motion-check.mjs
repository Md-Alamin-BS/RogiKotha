// `pnpm check:motion`: holds the patient stylesheets to the motion rules of T-011 (FD-091,
// frontend-components.md § 8, BR9.1). Zero dependencies: a brace-aware scanner reads declarations,
// not lines, so a value Prettier splits over several lines is judged whole.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const DEFAULT_FILES = ['apps/web/src/styles/patient.css', 'apps/web/src/styles/motion.css'];

const MOVE_PROPS = new Set(['transform', 'translate', 'scale', 'rotate']);
const ALLOWED_ANIMATED = new Set(['transform', 'opacity']);
const VIEW_TRANSITION_NAMES = new Set([
  'page',
  'masthead',
  'demo',
  'colophon',
  'emergency',
  'disclaimer',
  'none',
]);
const STATIC_NAMES = [
  /\.demo(?![\w-])/,
  /\.colophon(?![\w-])/,
  /\.emergency-lines(?![\w-])/,
  /\.emerg-card(?![\w-])/,
  /#view-emergency(?![\w-])/,
  /\[data-static/,
];
const TIME = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:ms|s)$/i;
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const GLOBAL_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);
const EASING_KEYWORDS = new Set([
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'linear',
  'step-start',
  'step-end',
]);
const ANIMATION_KEYWORDS = new Set([
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  'infinite',
  'none',
  'forwards',
  'backwards',
  'both',
  'running',
  'paused',
  'auto',
  'allow-discrete',
]);
const FUNCTION_TOKEN = /^(?:cubic-bezier|steps|linear|var|calc|min|max|clamp)\(/i;

const collapse = (text) => text.replace(/\s+/g, ' ').trim();

// Replaces each comment by spaces and keeps its newlines, so line numbers survive.
function blankComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

// Splits at `separator` outside parentheses, brackets and quotes.
function splitTop(text, separator) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const char of text) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && !quote && (separator === ' ' ? /\s/.test(char) : char === separator)) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}

// Returns the balanced `name( ... )` calls of a value as { name, args } (nested calls stay whole).
function findCalls(value, names) {
  const calls = [];
  const pattern = new RegExp(`(?<![\\w-])(${names.join('|')})\\(`, 'gi');
  for (const match of value.matchAll(pattern)) {
    let depth = 1;
    let end = match.index + match[0].length;
    while (end < value.length && depth > 0) {
      if (value[end] === '(') depth += 1;
      else if (value[end] === ')') depth -= 1;
      end += 1;
    }
    if (depth === 0) {
      calls.push({
        name: match[1].toLowerCase(),
        args: value.slice(match.index + match[0].length, end - 1),
      });
    }
  }
  return calls;
}

function parseDeclaration(text, line) {
  const colon = text.indexOf(':');
  if (colon === -1) return null;
  const raw = text.slice(0, colon).trim();
  if (raw === '') return null;
  const prop = raw.startsWith('--') ? raw : raw.toLowerCase();
  const value = text
    .slice(colon + 1)
    .replace(/!\s*important\s*$/i, '')
    .trim();
  return { prop, value, line };
}

// A brace-aware scan into a tree of at-rules, style rules and keyframe frames.
function parse(source) {
  const src = blankComments(source);
  const root = { kind: 'root', children: [], decls: [] };
  const stack = [root];
  const errors = [];
  let buffer = '';
  let bufferLine = 1;
  let line = 1;
  let paren = 0;
  let quote = null;

  const append = (char) => {
    if (buffer.trim() === '' && !/\s/.test(char)) bufferLine = line;
    buffer += char;
  };
  const flushDeclaration = () => {
    const top = stack[stack.length - 1];
    const text = buffer.trim();
    buffer = '';
    if (text === '' || top.kind === 'root') return;
    const decl = parseDeclaration(text, bufferLine);
    if (decl) top.decls.push(decl);
  };

  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (char === '\n') line += 1;
    if (quote) {
      append(char);
      if (char === '\\' && i + 1 < src.length) {
        i += 1;
        if (src[i] === '\n') line += 1;
        buffer += src[i];
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      append(char);
      continue;
    }
    if (char === '(') paren += 1;
    else if (char === ')') paren = Math.max(0, paren - 1);
    if (paren > 0 || char === '(' || char === ')') {
      append(char);
      continue;
    }
    if (char === '{') {
      const prelude = buffer.trim();
      const node = {
        kind: prelude.startsWith('@') ? 'at' : 'rule',
        prelude,
        line: bufferLine,
        children: [],
        decls: [],
        parent: stack[stack.length - 1],
      };
      node.parent.children.push(node);
      stack.push(node);
      buffer = '';
    } else if (char === '}') {
      flushDeclaration();
      if (stack.length > 1) stack.pop();
      else errors.push({ line, reason: 'an unmatched "}"' });
    } else if (char === ';') {
      flushDeclaration();
    } else {
      append(char);
    }
  }
  flushDeclaration();
  if (stack.length > 1) {
    errors.push({
      line: stack[stack.length - 1].line,
      reason: `a block opened by "${collapse(stack[stack.length - 1].prelude)}" is never closed`,
    });
  }
  return { root, errors };
}

// Flattens the tree into style rules (with their at-rule context) and keyframes.
function flatten(root) {
  const rules = [];
  const keyframes = [];
  const walk = (node, atStack) => {
    for (const child of node.children) {
      if (child.kind === 'at') {
        const prelude = collapse(child.prelude).toLowerCase();
        const isKeyframes = /^@(?:-\w+-)?keyframes\b/.test(prelude);
        if (isKeyframes) {
          const frames = child.children.map((frame) => ({
            line: frame.line,
            decls: frame.decls,
          }));
          keyframes.push({
            name: collapse(child.prelude).split(' ')[1] ?? '',
            line: child.line,
            atStack,
            frames,
          });
          for (const frame of child.children) {
            rules.push({
              line: frame.line,
              prelude: frame.prelude,
              selectors: splitTop(frame.prelude, ','),
              decls: frame.decls,
              atStack: [...atStack, prelude],
              inKeyframes: true,
            });
          }
        } else {
          rules.push({
            line: child.line,
            prelude: child.prelude,
            selectors: [],
            decls: child.decls,
            atStack,
            atRule: prelude,
            inKeyframes: false,
          });
          walk(child, [...atStack, prelude]);
        }
      } else {
        rules.push({
          line: child.line,
          prelude: child.prelude,
          selectors: splitTop(child.prelude, ','),
          decls: child.decls,
          atStack,
          inKeyframes: false,
        });
        walk(child, atStack);
      }
    }
  };
  walk(root, []);
  return { rules, keyframes };
}

const isTransitionProp = (prop) => /^(?:-webkit-)?transition(?:-|$)/.test(prop);
const isAnimationProp = (prop) => /^(?:-webkit-)?animation(?:-|$)/.test(prop);

// The animated property named by each item of a `transition` shorthand; null when it names none.
function transitionItems(decl) {
  if (decl.prop === 'transition-property') {
    return splitTop(decl.value, ',').map((item) => ({ property: item.toLowerCase() }));
  }
  return splitTop(decl.value, ',').flatMap((item) => {
    const tokens = splitTop(item, ' ');
    if (tokens.length === 1 && GLOBAL_KEYWORDS.has(tokens[0].toLowerCase())) return [];
    const names = tokens.filter((token) => {
      const lower = token.toLowerCase();
      return !(
        TIME.test(token) ||
        EASING_KEYWORDS.has(lower) ||
        FUNCTION_TOKEN.test(token) ||
        lower === 'allow-discrete' ||
        lower === 'normal'
      );
    });
    if (names.length === 0) return [{ property: null }];
    return names.map((name) => ({ property: name.toLowerCase() }));
  });
}

const animationNames = (decl) => {
  if (decl.prop === 'animation-name') {
    return splitTop(decl.value, ',').filter((name) => name.toLowerCase() !== 'none');
  }
  return splitTop(decl.value, ',').flatMap((item) =>
    splitTop(item, ' ').filter((token) => {
      const lower = token.toLowerCase();
      return !(
        TIME.test(token) ||
        NUMBER.test(token) ||
        EASING_KEYWORDS.has(lower) ||
        ANIMATION_KEYWORDS.has(lower) ||
        FUNCTION_TOKEN.test(token) ||
        GLOBAL_KEYWORDS.has(lower)
      );
    }),
  );
};

const GUARD_MEDIA = /\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/;
const hasGuardMedia = (atStack) =>
  atStack.some(
    (prelude) =>
      prelude.startsWith('@media') &&
      GUARD_MEDIA.test(prelude) &&
      !/\bnot\b|\bor\b|,/.test(prelude),
  );
const GUARD_SELECTOR = ':root:not([data-motion=reduced])';
const startsWithGuardSelector = (selector) =>
  collapse(selector).replace(/["']/g, '').startsWith(GUARD_SELECTOR);

// Removes every :not( ... ) group, so a selector's exclusions are not read as the selector.
function withoutNot(selector) {
  let result = selector;
  for (;;) {
    const at = result.search(/:not\(/);
    if (at === -1) return result;
    let depth = 1;
    let end = at + 5;
    while (end < result.length && depth > 0) {
      if (result[end] === '(') depth += 1;
      else if (result[end] === ')') depth -= 1;
      end += 1;
    }
    result = result.slice(0, at) + result.slice(end);
  }
}

// Expands the first :is() / :where() group into one selector per alternative.
function expandGroups(selector) {
  const match = /:(?:is|where)\(/.exec(selector);
  if (!match) return [selector];
  let depth = 1;
  let end = match.index + match[0].length;
  while (end < selector.length && depth > 0) {
    if (selector[end] === '(') depth += 1;
    else if (selector[end] === ')') depth -= 1;
    end += 1;
  }
  const inner = selector.slice(match.index + match[0].length, end - 1);
  return splitTop(inner, ',').flatMap((alternative) =>
    expandGroups(selector.slice(0, match.index) + alternative + selector.slice(end)),
  );
}

const BENGALI = /:lang\(\s*bn\s*\)/g;
const HAS_BENGALI = /:lang\(\s*bn\s*\)/;
const isZeroSpacing = (value) =>
  GLOBAL_KEYWORDS.has(value.toLowerCase()) ||
  value.toLowerCase() === 'normal' ||
  /^[+-]?0*\.?0*(?:em|rem|px|ch|%)?$/i.test(value);

// What the Bengali rules reset, keyed by the Latin selector each one answers.
function bengaliResets(rules) {
  const resets = new Map();
  for (const rule of rules) {
    if (rule.inKeyframes) continue;
    const noTransform = rule.decls.some(
      (decl) => decl.prop === 'text-transform' && decl.value.toLowerCase() === 'none',
    );
    const zeroSpacing = rule.decls.some(
      (decl) => decl.prop === 'letter-spacing' && isZeroSpacing(decl.value),
    );
    if (!noTransform && !zeroSpacing) continue;
    for (const selector of rule.selectors) {
      if (!HAS_BENGALI.test(selector)) continue;
      const target = collapse(selector.replace(BENGALI, '')).replace(/^html\s+/, '');
      for (const expanded of expandGroups(target)) {
        const entry = resets.get(collapse(expanded)) ?? { transform: false, spacing: false };
        entry.transform ||= noTransform;
        entry.spacing ||= zeroSpacing;
        resets.set(collapse(expanded), entry);
      }
    }
  }
  return resets;
}

const hasReset = (resets, selector, kind) => {
  const key = collapse(selector);
  if (resets.get(key)?.[kind]) return true;
  const alternatives = expandGroups(key);
  return (
    alternatives.length > 1 &&
    alternatives.every((alternative) => resets.get(collapse(alternative))?.[kind])
  );
};

// Numeric value of one scale() argument, or null when it cannot be read.
function scaleValue(token, definitions, depth = 0) {
  if (NUMBER.test(token)) return [Number(token)];
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)%$/.test(token)) return [Number.parseFloat(token) / 100];
  const reference = /^var\(\s*(--[\w-]+)\s*(?:,([^)]*))?\)$/i.exec(token);
  if (reference && depth < 5) {
    const found = definitions.get(reference[1]);
    if (found)
      return found.flatMap((value) => scaleValue(value.trim(), definitions, depth + 1) ?? [null]);
    if (reference[2] !== undefined) return scaleValue(reference[2].trim(), definitions, depth + 1);
    return [];
  }
  return null;
}

function scaleFindings(value, definitions, axisToo) {
  const names = axisToo ? ['scale', 'scale3d', 'scalex', 'scaley', 'scalez'] : ['scale', 'scale3d'];
  const reasons = [];
  for (const call of findCalls(value, names)) {
    for (const token of splitTop(call.args, ',').flatMap((part) => splitTop(part, ' '))) {
      const values = scaleValue(token, definitions);
      if (values === null || values.includes(null)) {
        reasons.push(`${call.name}(${collapse(call.args)}) cannot be checked against 0.98 to 1.02`);
        break;
      }
      const bad = values.find((number) => number < 0.98 || number > 1.02);
      if (bad !== undefined) {
        reasons.push(`${call.name}(${collapse(call.args)}) is outside 0.98 to 1.02 (BR4.3)`);
        break;
      }
    }
  }
  return reasons;
}

function scalePropertyFindings(value, definitions) {
  if (GLOBAL_KEYWORDS.has(value.toLowerCase()) || value.toLowerCase() === 'none') return [];
  for (const token of splitTop(value, ' ')) {
    const values = scaleValue(token, definitions);
    if (values === null || values.includes(null)) {
      return [`scale: ${collapse(value)} cannot be checked against 0.98 to 1.02`];
    }
    if (values.some((number) => number < 0.98 || number > 1.02)) {
      return [`scale: ${collapse(value)} is outside 0.98 to 1.02 (BR4.3)`];
    }
  }
  return [];
}

function darkTokens(rules) {
  const media = new Map();
  for (const rule of rules) {
    if (rule.inKeyframes || rule.atRule) continue;
    for (const selector of rule.selectors) {
      const normal = collapse(selector).replace(/["']/g, '');
      const inDarkMedia = rule.atStack.some(
        (at) => at.startsWith('@media') && /prefers-color-scheme\s*:\s*dark/.test(at),
      );
      if (inDarkMedia && normal === ':root:not([data-theme=light])') {
        for (const decl of rule.decls)
          if (decl.prop.startsWith('--')) media.set(decl.prop, collapse(decl.value));
      }
    }
  }
  return media;
}

/**
 * Scans stylesheets and returns the findings.
 * @param {{ name: string, text: string }[]} files `name` decides the file rules: only a file named
 *   `patient.css` is held to M6 and M10.
 * @returns {{ file: string, line: number, code: string, reason: string }[]}
 */
export function scan(files) {
  const findings = [];
  const parsed = files.map((file) => {
    const { root, errors } = parse(file.text);
    for (const error of errors) {
      findings.push({ file: file.name, line: error.line, code: 'M0-parse', reason: error.reason });
    }
    return { file, ...flatten(root) };
  });

  const allRules = parsed.flatMap((entry) => entry.rules);
  const allKeyframes = parsed.flatMap((entry) => entry.keyframes);
  const definitions = new Map();
  for (const rule of allRules) {
    for (const decl of rule.decls) {
      if (decl.prop.startsWith('--')) {
        definitions.set(decl.prop, [...(definitions.get(decl.prop) ?? []), decl.value]);
      }
    }
  }
  const keyframesByName = new Map(allKeyframes.map((entry) => [entry.name, entry]));
  const resets = bengaliResets(allRules);

  for (const { file, rules, keyframes } of parsed) {
    const base = path.basename(file.name);
    const isPatient = base === 'patient.css';
    const add = (line, code, reason) => findings.push({ file: file.name, line, code, reason });

    for (const keyframe of keyframes) {
      for (const frame of keyframe.frames) {
        for (const decl of frame.decls) {
          if (!ALLOWED_ANIMATED.has(decl.prop)) {
            add(
              decl.line,
              'M1-property',
              `@keyframes ${keyframe.name} animates ${decl.prop}; only transform and opacity may (BR4.2)`,
            );
          }
        }
      }
      const moves = keyframe.frames.some((frame) =>
        frame.decls.some((decl) => MOVE_PROPS.has(decl.prop)),
      );
      if (moves && !hasGuardMedia(keyframe.atStack)) {
        add(
          keyframe.line,
          'M5-guard',
          `@keyframes ${keyframe.name} moves and sits outside @media (prefers-reduced-motion: no-preference) (BR5.3)`,
        );
      }
      if (isPatient)
        add(keyframe.line, 'M6-file', `@keyframes ${keyframe.name} belongs in motion.css (BR4.7)`);
    }

    for (const rule of rules) {
      if (rule.atRule) {
        if (isPatient && rule.atRule.startsWith('@starting-style')) {
          add(rule.line, 'M6-file', '@starting-style belongs in motion.css (BR4.7)');
        }
        continue;
      }
      const selectorText = rule.selectors.map(collapse).join(', ');
      let movesInRule = false;
      let motionInRule = false;

      for (const decl of rule.decls) {
        const lowerValue = decl.value.toLowerCase();
        const isNone = lowerValue === 'none';

        if (isPatient && !rule.inKeyframes) {
          if (
            isTransitionProp(decl.prop) ||
            isAnimationProp(decl.prop) ||
            /^(?:view|scroll)-timeline/.test(decl.prop) ||
            /^view-transition-(?:name|class)$/.test(decl.prop)
          ) {
            add(decl.line, 'M6-file', `${decl.prop} belongs in motion.css (BR4.7)`);
          }
        }

        if (
          decl.prop === 'transition' ||
          decl.prop === 'transition-property' ||
          decl.prop === '-webkit-transition'
        ) {
          if (!isNone && !GLOBAL_KEYWORDS.has(lowerValue)) {
            motionInRule = true;
            for (const item of transitionItems(decl)) {
              if (item.property === null) {
                add(
                  decl.line,
                  'M1-property',
                  'a transition names no property, so it animates all (BR4.2)',
                );
              } else if (item.property === 'all') {
                add(decl.line, 'M1-property', 'transition: all animates every property (BR4.2)');
              } else if (item.property !== 'none' && !ALLOWED_ANIMATED.has(item.property)) {
                add(
                  decl.line,
                  'M1-property',
                  `transition of ${item.property}; only transform and opacity may animate (BR4.2)`,
                );
              }
              if (item.property !== null && MOVE_PROPS.has(item.property)) movesInRule = true;
            }
          }
        }

        if (isTransitionProp(decl.prop) || isAnimationProp(decl.prop)) {
          for (const match of decl.value.matchAll(
            /(?<![\w.#-])[+-]?(?:\d+\.?\d*|\.\d+)(?:ms|s)(?![\w-])/gi,
          )) {
            if (Number.parseFloat(match[0]) !== 0) {
              add(
                decl.line,
                'M2-duration',
                `literal time ${match[0]} in ${decl.prop}; use a --dur-* or --stagger token (BR4.1)`,
              );
            }
          }
        }

        if (decl.prop === 'animation-iteration-count') {
          if (splitTop(decl.value, ',').some((item) => item !== '1')) {
            add(
              decl.line,
              'M3-iteration',
              `animation-iteration-count: ${decl.value}; every animation runs once (BR4.4)`,
            );
          }
        } else if (decl.prop === 'animation-direction') {
          if (/alternate/i.test(decl.value)) {
            add(
              decl.line,
              'M3-iteration',
              `animation-direction: ${decl.value} repeats back and forth (BR4.4)`,
            );
          }
        } else if (decl.prop === 'animation' || decl.prop === '-webkit-animation') {
          for (const item of splitTop(decl.value, ',')) {
            for (const token of splitTop(item, ' ')) {
              const lower = token.toLowerCase();
              if (
                lower === 'infinite' ||
                lower.startsWith('alternate') ||
                (NUMBER.test(token) && Number(token) !== 1)
              ) {
                add(
                  decl.line,
                  'M3-iteration',
                  `animation repeats (${token}); every animation runs once (BR4.4)`,
                );
              }
            }
          }
        }

        if (
          isAnimationProp(decl.prop) &&
          (decl.prop === 'animation' || decl.prop === 'animation-name') &&
          !isNone
        ) {
          const names = animationNames(decl);
          if (names.length > 0) {
            motionInRule = true;
            const viewTransition = /::view-transition/.test(selectorText);
            const moves = names.some((name) => {
              const known = keyframesByName.get(name);
              return (
                !known ||
                known.frames.some((frame) => frame.decls.some((d) => MOVE_PROPS.has(d.prop)))
              );
            });
            if (viewTransition || moves) movesInRule = true;
          }
        }

        for (const reason of scaleFindings(
          decl.value,
          definitions,
          rule.inKeyframes || !isPatient,
        )) {
          add(decl.line, 'M4-scale', reason);
        }
        if (decl.prop === 'scale') {
          for (const reason of scalePropertyFindings(decl.value, definitions))
            add(decl.line, 'M4-scale', reason);
        }

        if (decl.prop === 'view-transition-name' && !VIEW_TRANSITION_NAMES.has(lowerValue)) {
          add(
            decl.line,
            'M11-vt-name',
            `view-transition-name: ${decl.value}; only page, masthead, demo, colophon, emergency and disclaimer (BR6.12)`,
          );
        }

        if (
          !rule.inKeyframes &&
          MOVE_PROPS.has(decl.prop) &&
          rule.selectors.some((selector) => selector.includes(':hover'))
        ) {
          add(
            decl.line,
            'M9-hover',
            `${decl.prop} in a :hover rule (${selectorText}); hover changes colour only (BR6.5)`,
          );
        }

        if (
          !rule.inKeyframes &&
          (decl.prop === 'text-transform' || decl.prop === 'letter-spacing')
        ) {
          const upper = decl.prop === 'text-transform' && lowerValue === 'uppercase';
          const spaced = decl.prop === 'letter-spacing' && !isZeroSpacing(decl.value);
          if (upper || spaced) {
            for (const selector of rule.selectors) {
              if (/:lang\(|\[lang/.test(selector)) continue;
              const kind = upper ? 'transform' : 'spacing';
              if (!hasReset(resets, selector, kind)) {
                add(
                  decl.line,
                  'M8-bangla',
                  `${decl.prop}: ${decl.value} on ${collapse(selector)} has no html:lang(bn) rule that resets it (BR2.2)`,
                );
              }
            }
          }
        }
      }

      if (!rule.inKeyframes && movesInRule) {
        const guarded =
          hasGuardMedia(rule.atStack) && rule.selectors.every(startsWithGuardSelector);
        if (!guarded) {
          add(
            rule.line,
            'M5-guard',
            `${selectorText} moves outside @media (prefers-reduced-motion: no-preference) with a selector starting :root:not([data-motion="reduced"]) (BR5.3)`,
          );
        }
      }

      if (
        !rule.inKeyframes &&
        motionInRule &&
        rule.selectors.some((selector) =>
          STATIC_NAMES.some((name) => name.test(withoutNot(selector))),
        )
      ) {
        add(
          rule.line,
          'M7-static',
          `${selectorText} selects a never-animated element outside :not() (BR7.4)`,
        );
      }

      if (
        isPatient &&
        !rule.inKeyframes &&
        rule.selectors.some((selector) => selector.includes('::view-transition'))
      ) {
        add(rule.line, 'M6-file', `${selectorText} belongs in motion.css (BR4.7)`);
      }
    }

    if (isPatient) {
      const lines = blankComments(file.text).split('\n');
      const explicit = [];
      lines.forEach((text, index) => {
        if (/^:root\[data-theme=["']dark["']\]\s*\{/.test(text)) explicit.push(index + 1);
        if (/^:root\[data-scheme=/.test(text)) {
          add(
            index + 1,
            'M10-tokens',
            'a column-0 :root[data-scheme=…] block adds a variant the contrast tool does not check (BR1.8)',
          );
        }
      });
      if (explicit.length !== 1) {
        add(
          explicit[1] ?? explicit[0] ?? 1,
          'M10-tokens',
          `${explicit.length} column-0 :root[data-theme="dark"] blocks (lines ${explicit.join(', ') || 'none'}); exactly one is required (BR1.8)`,
        );
      } else {
        const media = darkTokens(rules);
        const explicitTokens = new Map();
        for (const rule of rules) {
          if (rule.line === explicit[0] && !rule.atRule) {
            for (const decl of rule.decls)
              if (decl.prop.startsWith('--')) explicitTokens.set(decl.prop, collapse(decl.value));
          }
        }
        if (media.size === 0) {
          add(
            explicit[0],
            'M10-tokens',
            'no @media (prefers-color-scheme: dark) block with :root:not([data-theme="light"]) to compare with (BR1.7)',
          );
        } else {
          for (const [name, value] of media) {
            if (!explicitTokens.has(name))
              add(
                explicit[0],
                'M10-tokens',
                `${name} is in the prefers-color-scheme dark block but not in :root[data-theme="dark"] (BR1.7)`,
              );
            else if (explicitTokens.get(name) !== value)
              add(
                explicit[0],
                'M10-tokens',
                `${name} differs between the dark blocks: "${value}" in prefers-color-scheme, "${explicitTokens.get(name)}" in :root[data-theme="dark"] (BR1.7)`,
              );
          }
          for (const name of explicitTokens.keys()) {
            if (!media.has(name))
              add(
                explicit[0],
                'M10-tokens',
                `${name} is in :root[data-theme="dark"] but not in the prefers-color-scheme dark block (BR1.7)`,
              );
          }
        }
      }
    }
  }

  return findings.sort(
    (a, b) =>
      files.findIndex((f) => f.name === a.file) - files.findIndex((f) => f.name === b.file) ||
      a.line - b.line ||
      a.code.localeCompare(b.code),
  );
}

export const formatFinding = (finding) =>
  `${finding.file}:${finding.line}  ${finding.code}  ${finding.reason}`;

function main() {
  const given = process.argv.slice(2);
  const targets = given.length > 0 ? given : DEFAULT_FILES.map((file) => path.join(REPO, file));
  const files = [];
  for (const target of targets) {
    try {
      files.push({
        name: given.length > 0 ? target : path.relative(REPO, target).split(path.sep).join('/'),
        text: readFileSync(target, 'utf8'),
      });
    } catch (error) {
      console.error(`FAIL: cannot read ${target}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }
  const findings = scan(files);
  if (findings.length > 0) {
    for (const finding of findings) process.stdout.write(`${formatFinding(finding)}\n`);
    process.stdout.write(
      `FAIL: ${findings.length} motion finding(s) in ${files.length} stylesheet(s).\n`,
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`OK - ${files.length} stylesheet(s) pass the motion rules (M1-M11).\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
