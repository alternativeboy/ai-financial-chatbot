-- Indexes for financial_data (handoff §4.1).
--
-- Runs after 01, which creates the table and bulk-loads the 192 rows. Building
-- indexes after the COPY rather than before is deliberate: maintaining them
-- during a bulk load is slower.
--
-- The dump in data/ is a plain pg_dump COPY with no index definitions, so this
-- file is the only place they exist. Keep it in sync with §4.1.

CREATE INDEX IF NOT EXISTS idx_financial_company_year ON financial_data (company, year);
CREATE INDEX IF NOT EXISTS idx_financial_sector       ON financial_data (sector);
CREATE INDEX IF NOT EXISTS idx_financial_ticker       ON financial_data (ticker);

-- The table is loaded once and never written again, so a single ANALYZE here
-- gives the planner accurate statistics for the life of the container.
ANALYZE financial_data;
