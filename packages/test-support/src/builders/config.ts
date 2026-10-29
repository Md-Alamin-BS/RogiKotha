// `aConfig()` — validates directly against the real `ConfigValuesSchema`
// (contracts/config-values.ts): the config entity itself *is* the command
// input for `config.apply`, so this is a full 1:1 match.
import { ConfigValuesSchema, DEFAULT_CONFIG_VALUES, type ConfigValues } from '@rogikotha/contracts';

export function aConfig(overrides: Partial<ConfigValues> = {}): ConfigValues {
  const merged: ConfigValues = {
    ...DEFAULT_CONFIG_VALUES,
    ...overrides,
    thresholds: { ...DEFAULT_CONFIG_VALUES.thresholds, ...overrides.thresholds },
    retention: { ...DEFAULT_CONFIG_VALUES.retention, ...overrides.retention },
    capabilities: {
      admin: { ...DEFAULT_CONFIG_VALUES.capabilities.admin, ...overrides.capabilities?.admin },
      moderator: {
        ...DEFAULT_CONFIG_VALUES.capabilities.moderator,
        ...overrides.capabilities?.moderator,
      },
    },
    featureVisibility: {
      ...DEFAULT_CONFIG_VALUES.featureVisibility,
      ...overrides.featureVisibility,
    },
    emergency: { ...DEFAULT_CONFIG_VALUES.emergency, ...overrides.emergency },
  };
  // Fail loudly in a test if an override produced something invalid, rather
  // than silently seeding a bad config.
  return ConfigValuesSchema.parse(merged);
}
