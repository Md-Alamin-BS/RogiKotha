// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { clientAddressFrom } from './client-address';

describe('the client address for the network limits (T-101 § 10.4)', () => {
  it('takes the first forwarded address outside production', () => {
    const headers = new Headers({ 'x-forwarded-for': ' 192.0.2.10 , 198.51.100.7' });
    expect(clientAddressFrom(headers, 'demo')).toBe('192.0.2.10');
  });

  it('trusts no forwarded header in production until T-502 sets the proxy rule', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.0.2.10' });
    expect(clientAddressFrom(headers, 'production')).toBeNull();
  });

  it('answers null without a header, with an empty one or with an absurdly long one', () => {
    expect(clientAddressFrom(new Headers(), undefined)).toBeNull();
    expect(clientAddressFrom(new Headers({ 'x-forwarded-for': ' , ' }), 'demo')).toBeNull();
    expect(
      clientAddressFrom(new Headers({ 'x-forwarded-for': 'x'.repeat(65) }), 'demo'),
    ).toBeNull();
  });
});
