// `ConfigProvider` port fake (03-routes-and-contracts.md §3: `current() -> ConfigValues`).
// Task step 5: "StaticConfigProvider".
import { DEFAULT_CONFIG_VALUES, type ConfigValues } from '@rogikotha/contracts';

export class StaticConfigProvider {
  private values: ConfigValues;

  constructor(values: ConfigValues = DEFAULT_CONFIG_VALUES) {
    this.values = values;
  }

  current(): ConfigValues {
    return this.values;
  }

  /** Test-only helper to change what `current()` returns mid-test. */
  set(values: ConfigValues): void {
    this.values = values;
  }
}
