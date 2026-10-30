/** Thrown by a demo data function whose body the feature step has not written yet. */
export class NotBuiltYet extends Error {
  constructor(readonly args: Record<string, unknown>) {
    super('not built yet');
    this.name = 'NotBuiltYet';
  }
}
