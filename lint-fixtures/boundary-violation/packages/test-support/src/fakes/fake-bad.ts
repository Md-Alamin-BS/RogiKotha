// FX6 (violation): only test-support/src/seed may import database (BR2.2, FD-040).
import * as database from '@rogikotha/database';

export const fakeBad = database;
