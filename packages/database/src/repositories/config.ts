// Stubs only (task step 15). Method names given explicitly by the task file
// (module `administration`, T-105/T-408).
import { NotImplemented } from './not-implemented.js';

export class PgConfigRepository {
  currentVersion(): Promise<unknown> {
    throw new NotImplemented('T-105');
  }

  history(): Promise<unknown> {
    throw new NotImplemented('T-408');
  }

  insertVersion(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-105', { input });
  }
}
