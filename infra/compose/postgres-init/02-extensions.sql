-- Extensions needed by the application schema (T-004) and search (PostgreSQL search, FD-035).
-- uuidv7() is built into PostgreSQL 18 core; no extension needed for it.
-- Applied to both the main and test databases so `DATABASE_URL_TEST` behaves identically.
\c rogikotha
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\c rogikotha_test
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
