// The next-intl request config the app loads (next.config.ts): @rogikotha/i18n owns it (T-006);
// this file only wires its error reporter to the web logger (BR6.7).
// ASSUMPTION(U41): it lives in `server/`, not `i18n/`, because the `web-shared` element may not
// import the logger (eslint.boundaries.mjs); next.config.ts points the plugin here.
import { createRequestConfig } from '@rogikotha/i18n/request';

import { createWebLogger } from './logger';

const logger = createWebLogger();

export default createRequestConfig({
  onIntlError: (errorCode) => logger.error('i18n.message_error', { errorCode }),
});
