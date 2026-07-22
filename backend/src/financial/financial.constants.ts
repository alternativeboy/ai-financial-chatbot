/** Name of the second TypeORM connection, which logs in as llm_reader. */
export const LLM_READER_CONNECTION = 'llm_reader';

/**
 * Ceiling on rows handed back to the model. The table is small, but a
 * three-way self join is 7,077,888 rows — the cap is enforced in the database
 * (see FinancialService) rather than by slicing afterwards, so a query like
 * that never reaches this process.
 */
export const MAX_RESULT_ROWS = 200;

/** Postgres-side wall clock per query. Also what stops pg_sleep(10). */
export const STATEMENT_TIMEOUT_MS = 5000;
