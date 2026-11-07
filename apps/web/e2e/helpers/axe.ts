import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

// BR3.1, BR3.2: axe on every walked page and after every sheet or disclosure opens; a serious or
// critical violation fails the test.

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export interface AxeExclusion {
  ruleId: string;
  /** A CSS selector matched against the node target axe reports. */
  selector: string;
  reason: string;
  /** The ISS row that records the exclusion, for example `ISS-760`. */
  iss: string;
}

/** BR3.2: empty at Code Generation; every entry names its rule, selector, reason and ISS row. */
export const EXCLUSIONS: readonly AxeExclusion[] = [];

interface AxeNode {
  target: unknown;
  html?: string;
}

interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  nodes: AxeNode[];
}

const BLOCKING = new Set(['serious', 'critical']);

export function isExcluded(
  ruleId: string,
  node: AxeNode,
  exclusions: readonly AxeExclusion[] = EXCLUSIONS,
): boolean {
  const target = JSON.stringify(node.target);
  return exclusions.some(
    (exclusion) => exclusion.ruleId === ruleId && target.includes(exclusion.selector),
  );
}

/** The serious and critical violations left after the recorded exclusions. */
export function blockingViolations(
  violations: readonly AxeViolation[],
  exclusions: readonly AxeExclusion[] = EXCLUSIONS,
): AxeViolation[] {
  return violations
    .filter((violation) => BLOCKING.has(violation.impact ?? ''))
    .map((violation) => ({
      ...violation,
      nodes: violation.nodes.filter((node) => !isExcluded(violation.id, node, exclusions)),
    }))
    .filter((violation) => violation.nodes.length > 0);
}

const describe = (violation: AxeViolation): string =>
  `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help} at ${violation.nodes
    .map((node) => JSON.stringify(node.target))
    .join(', ')}`;

/**
 * Runs axe on the page as it is now, attaches the full result, records moderate and minor
 * findings as annotations (they become S3 rows at Build and Test) and fails on the rest.
 */
export async function expectNoSeriousViolations(
  page: Page,
  label = new URL(page.url()).pathname,
  testInfo: TestInfo = test.info(),
): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  await testInfo.attach(`axe ${label}`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  const violations = results.violations as AxeViolation[];
  for (const violation of violations) {
    if (!BLOCKING.has(violation.impact ?? '')) {
      testInfo.annotations.push({
        type: 'axe-minor',
        description: `${label}: ${describe(violation)}`,
      });
    }
  }
  const blocking = blockingViolations(violations);
  expect(blocking.map(describe), `axe serious or critical violations on ${label}`).toEqual([]);
}
