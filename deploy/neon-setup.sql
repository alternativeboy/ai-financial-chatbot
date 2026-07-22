-- One-time setup for a managed Postgres (Neon, Supabase, …).
--
-- The Docker image runs docker/postgres/*.sql automatically on first boot;
-- a managed database has no such hook, so the same three steps are collected
-- here. Run AFTER loading data/financial_data.sql:
--
--   psql "$DATABASE_URL" -f data/financial_data.sql
--   psql "$DATABASE_URL" -v llm_password="'a-strong-password'" -f deploy/neon-setup.sql
--
-- Then apply the migrations that create conversations/messages:
--   cd backend && DATABASE_SSL=true npm run migration:run

\set ON_ERROR_STOP on

-- 1. Indexes (mirrors docker/postgres/02-indexes.sql)
CREATE INDEX IF NOT EXISTS idx_financial_company_year ON financial_data (company, year);
CREATE INDEX IF NOT EXISTS idx_financial_sector       ON financial_data (sector);
CREATE INDEX IF NOT EXISTS idx_financial_ticker       ON financial_data (ticker);
ANALYZE financial_data;

-- 2. The SELECT-only role that runs model-authored SQL (mirrors 03-llm-reader.sh).
--    Built with format()+\gexec for the same reason as the shell script: psql
--    does not interpolate variables inside a dollar-quoted DO block, so the
--    password would arrive as literal text.
SELECT format('CREATE ROLE llm_reader LOGIN PASSWORD %L', :llm_password)
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'llm_reader')
\gexec

GRANT CONNECT ON DATABASE :"DBNAME" TO llm_reader;
GRANT USAGE   ON SCHEMA public      TO llm_reader;
GRANT SELECT  ON financial_data     TO llm_reader;

REVOKE CREATE ON SCHEMA public FROM llm_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM llm_reader;

-- 3. Prove it. Both should be true; the second is the guarantee the app relies on.
SELECT has_table_privilege('llm_reader', 'financial_data', 'SELECT') AS can_read,
       NOT has_table_privilege('llm_reader', 'financial_data', 'INSERT') AS cannot_write;
