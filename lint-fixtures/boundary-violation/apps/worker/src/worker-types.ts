// FX11 (control): a type-only import of the application root carries no capability (BR3.5).
import type * as application from '@rogikotha/application';

export type WorkerTypes = typeof application;
