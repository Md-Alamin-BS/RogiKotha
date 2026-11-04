// FX22 (violation): the worker may not import the i18n package root, which loads next-intl (FD-098).
import * as i18n from '@rogikotha/i18n';

export const workerI18n = i18n;
