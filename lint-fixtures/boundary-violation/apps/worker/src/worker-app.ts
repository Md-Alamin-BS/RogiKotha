// FX9 (violation): a value import of the application root is refused in the worker (BR3.5).
import * as application from '@rogikotha/application';

export const workerApp = application;
