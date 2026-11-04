import { describe, expect, it } from 'vitest';

import { browserFamily, osFamily } from './user-agent';

const AGENTS = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};

describe('the session list user-agent families', () => {
  it('names the browser family of common agents', () => {
    expect(Object.values(AGENTS).map(browserFamily)).toEqual([
      'Chrome',
      'Edge',
      'Firefox',
      'Safari',
      'Chrome',
      'Safari',
    ]);
  });

  it('names the operating system family, Android and iOS before Linux and macOS', () => {
    expect(Object.values(AGENTS).map(osFamily)).toEqual([
      'Windows',
      'Windows',
      'Linux',
      'macOS',
      'Android',
      'iOS',
    ]);
  });

  it('answers null for a missing or unknown agent', () => {
    expect(browserFamily(null)).toBeNull();
    expect(osFamily('curl/8.9.1')).toBeNull();
    expect(browserFamily('curl/8.9.1')).toBeNull();
  });
});
