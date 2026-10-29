// Thrown by every repository stub method below. `application`'s port
// interfaces do not exist yet (T-101 onward wires the `implements` clause on
// each repository class); until then, a method body's only job is to name
// the task that owns its real implementation.
export class NotImplemented extends Error {
  // `context` records the call's arguments (object-shorthand at each call
  // site) so every stub method's parameters are genuinely read, not just
  // declared for documentation — satisfies `no-unused-vars` honestly
  // instead of prefixing every one with `_`.
  constructor(owningTask: string, context?: Record<string, unknown>) {
    super(
      `not implemented — owned by ${owningTask}${context ? ` ${JSON.stringify(context)}` : ''}`,
    );
    this.name = 'NotImplemented';
  }
}
