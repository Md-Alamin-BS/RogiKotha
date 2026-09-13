// Replaces: `renderConfig` (staff config editor + history/rollback),
// admin/app.js. Maps from `config_versions`/`config_changes`
// (02-data-model.md §11).
//
// TODO(T-408): owner refines every field below against the ported
// component.
import type { ConfigValues } from '../config-values.js';

export interface ConfigChangeRowVM {
  path: string;
  before: unknown;
  after: unknown;
}

export interface ConfigVersionVM {
  version: number;
  effectiveFrom: string;
  reason: string;
  changes: ConfigChangeRowVM[];
}

export interface ConfigVM {
  version: number;
  values: ConfigValues;
  history: ConfigVersionVM[];
}
