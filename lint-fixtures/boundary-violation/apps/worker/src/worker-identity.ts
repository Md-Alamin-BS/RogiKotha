// FX24 (violation): the worker may not import the identity module, which can join personas to
// accounts (U11 BR3.7, AD-6).
import * as identity from '../../../../../packages/application/src/modules/identity/index';

export const workerIdentity = identity;
