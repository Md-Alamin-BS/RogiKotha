import { describe, expect, it } from 'vitest';

import {
  COMMENT_BODY_MAX,
  COMMENT_POST_LIMIT,
  COMMENT_POST_WINDOW_SEC,
  THREAD_CAP,
} from './limits';

describe('community limits', () => {
  it('pins the release-1 values that stand in for T-105 (C18)', () => {
    expect(COMMENT_BODY_MAX).toBe(2000);
    expect(COMMENT_POST_LIMIT).toBe(30);
    expect(COMMENT_POST_WINDOW_SEC).toBe(3600);
    expect(THREAD_CAP).toBe(500);
  });
});
