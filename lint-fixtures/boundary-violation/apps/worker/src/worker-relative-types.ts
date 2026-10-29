// FX21 (control): a type-only import of application code by a relative path stays allowed (BR3.5).
import type * as application from '../../../../../packages/application/src/index';

export type WorkerRelativeTypes = typeof application;
