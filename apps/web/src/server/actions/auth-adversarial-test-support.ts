// The browser the U9 adversarial tests (plan Step 14) play: one cookie jar, every write it saw and
// its forwarded address, for `next/headers` mocks built with `cookieJarModule()`. Each submission
// can come from its own synthetic address so the network limits never decide an answer.
export interface CookieWrite {
  op: 'set' | 'delete';
  name: string;
  value: string;
  options: unknown;
}

export const browser = {
  values: new Map<string, string>(),
  writes: [] as CookieWrite[],
  forwardedFor: '',
};

let addresses = 0;
const RUN_HEX = (Date.now() % 0xffff).toString(16);

/** A fresh documentation-range IPv6 address (RFC 3849), unique to this run. */
export function nextAddress(): string {
  addresses += 1;
  return `2001:db8:${RUN_HEX}::${addresses.toString(16)}`;
}

/** Starts a new submission from a new address, keeping the jar's cookies. */
export function newRequest(): void {
  browser.writes.length = 0;
  browser.forwardedFor = nextAddress();
}

/** A browser that holds no cookies at all. */
export function signedOutBrowser(): void {
  browser.values.clear();
  newRequest();
}

export function cookieJarModule() {
  const cookieHeader = () =>
    [...browser.values].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ');
  return {
    headers: () => {
      const headers = new Headers();
      if (browser.values.size > 0) headers.set('cookie', cookieHeader());
      if (browser.forwardedFor) headers.set('x-forwarded-for', browser.forwardedFor);
      return Promise.resolve(headers);
    },
    cookies: () =>
      Promise.resolve({
        get: (name: string) => {
          const value = browser.values.get(name);
          return value === undefined ? undefined : { name, value };
        },
        getAll: () => [...browser.values].map(([name, value]) => ({ name, value })),
        has: (name: string) => browser.values.has(name),
        set: (name: string, value: string, options?: unknown) => {
          browser.writes.push({ op: 'set', name, value, options });
          browser.values.set(name, value);
        },
        delete: (target: string | { name: string }) => {
          const name = typeof target === 'string' ? target : target.name;
          browser.writes.push({ op: 'delete', name, value: '', options: undefined });
          browser.values.delete(name);
        },
      }),
  };
}

export function formOf(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

/** The message a submission threw (a redirect is `NEXT_REDIRECT <target>`), or null. */
export function thrownBy(outcome: unknown): string | null {
  if (typeof outcome !== 'object' || outcome === null || !('thrown' in outcome)) return null;
  return String(outcome.thrown);
}

/** The state a submission returned, or null when it threw. */
export function stateOf(outcome: unknown): unknown {
  if (typeof outcome !== 'object' || outcome === null || !('state' in outcome)) return null;
  return outcome.state;
}

/** Runs a form action and returns what the browser saw: the state, or the redirect it threw. */
export async function submit(action: () => Promise<unknown>): Promise<unknown> {
  try {
    return { state: await action() };
  } catch (error: unknown) {
    return { thrown: error instanceof Error ? error.message : 'unknown' };
  }
}
