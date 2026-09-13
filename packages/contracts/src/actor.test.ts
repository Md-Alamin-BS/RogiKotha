import { describe, expect, it } from 'vitest';

import { ALL_CAPABILITIES, capabilitiesForRole } from './actor';
import { DEFAULT_CONFIG_VALUES } from './config-values';

describe('capabilitiesForRole', () => {
  it('super admin has every capability', () => {
    const capabilities = capabilitiesForRole('super_admin', DEFAULT_CONFIG_VALUES.capabilities);
    expect(new Set(capabilities)).toEqual(new Set(ALL_CAPABILITIES));
  });

  it('admin gains identity.reveal only when config enables it', () => {
    const withoutToggle = capabilitiesForRole('admin', DEFAULT_CONFIG_VALUES.capabilities);
    expect(withoutToggle).not.toContain('identity.reveal');

    const withToggle = capabilitiesForRole('admin', {
      ...DEFAULT_CONFIG_VALUES.capabilities,
      admin: { revealIdentity: true, originalEvidence: false },
    });
    expect(withToggle).toContain('identity.reveal');
    expect(withToggle).not.toContain('evidence.original');
  });

  it('moderator never gains providers.decide', () => {
    const capabilities = capabilitiesForRole('moderator', {
      admin: { revealIdentity: true, originalEvidence: true },
      moderator: { revealIdentity: true, originalEvidence: true },
    });
    expect(capabilities).not.toContain('providers.decide');
    expect(capabilities).toContain('reports.read');
    expect(capabilities).toContain('content.act');
  });
});
