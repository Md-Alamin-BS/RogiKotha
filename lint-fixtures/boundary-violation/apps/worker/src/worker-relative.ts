// FX16 (violation): a relative-path value import of application code is refused too (BR3.5).
import * as application from '../../../../../packages/application/src/index';

export const workerRelative = application;
