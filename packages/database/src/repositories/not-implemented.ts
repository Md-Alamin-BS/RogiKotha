// Thrown by every repository stub method: a method body's only job is to name the task that owns
// its real implementation.
export class NotImplemented extends Error {
  // Each call site passes its arguments as `context`, so every declared parameter is read. Only
  // the parameter names reach the message: an argument may be an email or a body, and messages
  // end up in logs (01-conventions.md §11, ISS-111 item 1).
  constructor(owningTask: string, context?: Record<string, unknown>) {
    const names = context ? Object.keys(context) : [];
    super(
      `not implemented — owned by ${owningTask}${names.length > 0 ? ` (${names.join(', ')})` : ''}`,
    );
    this.name = 'NotImplemented';
  }
}
