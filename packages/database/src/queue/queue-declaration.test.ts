import { describe, expect, it } from 'vitest';

import {
  DEFAULT_QUEUE_DECLARATION,
  QUEUE_DECLARATION,
  queueDeclarationFor,
} from './queue-declaration';

describe('the queue declaration of the evidence jobs', () => {
  it('gives evidence.process three retries 10 s apart with backoff and a 300 s expiry (BR4.1, BR4.6)', () => {
    expect(QUEUE_DECLARATION['evidence.process']).toEqual({
      policy: 'exclusive',
      retryLimit: 3,
      retryDelaySeconds: 10,
      retryBackoff: true,
      expireInSeconds: 300,
    });
  });

  it('declares evidence.sweep with the default policy', () => {
    expect(QUEUE_DECLARATION['evidence.sweep']).toEqual(DEFAULT_QUEUE_DECLARATION);
    expect(queueDeclarationFor('evidence.sweep')).toBe(DEFAULT_QUEUE_DECLARATION);
  });

  it('keeps every entry frozen', () => {
    expect(Object.isFrozen(QUEUE_DECLARATION['evidence.process'])).toBe(true);
    expect(Object.isFrozen(QUEUE_DECLARATION)).toBe(true);
  });
});
