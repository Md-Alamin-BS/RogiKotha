// `ConfigProvider` port fake. The port is asynchronous since T-105 Q2 A (T-101 BR3.4, F31).
import type { ConfigProvider } from '@rogikotha/application';
import { DEFAULT_CONFIG_VALUES, type ConfigValues } from '@rogikotha/contracts';

export class StaticConfigProvider implements ConfigProvider {
  private values: ConfigValues;

  constructor(values: ConfigValues = DEFAULT_CONFIG_VALUES) {
    this.values = values;
  }

  current(): Promise<ConfigValues> {
    return Promise.resolve(this.values);
  }

  /** Test-only helper to change what `current()` returns mid-test. */
  set(values: ConfigValues): void {
    this.values = values;
  }
}
