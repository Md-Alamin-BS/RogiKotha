// BR1.5: a future `next/script` passes this nonce; the proxy sets `x-nonce` on every page request.
import { headers } from 'next/headers';

export const NONCE_HEADER = 'x-nonce';

export async function readNonce(): Promise<string | undefined> {
  const requestHeaders = await headers();
  return requestHeaders.get(NONCE_HEADER) ?? undefined;
}
