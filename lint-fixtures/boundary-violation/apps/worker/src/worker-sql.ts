// FX10 (violation): the worker imports neither drizzle-orm nor pg (BR3.6).
import { sql } from 'drizzle-orm';

export const workerSql = sql;
