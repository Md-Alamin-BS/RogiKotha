// Asynchronous since T-105 Q2 A; T-101's web container gives a defaults-only provider.
import type { ConfigValues } from '@rogikotha/contracts';

export interface ConfigProvider {
  current(): Promise<ConfigValues>;
}
