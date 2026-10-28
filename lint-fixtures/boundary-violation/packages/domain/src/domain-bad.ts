// FX1 (violation): domain imports nothing, so this edge to application is refused (BR2.1).
import * as application from '@rogikotha/application';

export const domainBad = application;
