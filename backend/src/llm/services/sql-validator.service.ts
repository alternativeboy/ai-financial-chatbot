import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Statements that would modify data or schema. EXECUTE and EXEC are included
 * because they can launch a prepared statement that was never inspected here.
 */
export const BLOCKED_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'CREATE',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'COPY',
  'LOAD',
  'IMPORT',
] as const;

/**
 * `pg_` covers the catalog and every built-in function reachable through it,
 * including pg_sleep. `users` and `audit_logs` do not exist in this build; they
 * stay listed so that adding them later cannot silently open a path.
 */
export const BLOCKED_TABLES = [
  'pg_',
  'information_schema',
  'users',
  'conversations',
  'messages',
  'audit_logs',
] as const;

const REQUIRED_TABLE = 'financial_data';

/**
 * Layer 2 of the SQL guardrail: inspect the model's query before running it.
 *
 * This is a detective control, not the guarantee. It reasons about a string,
 * and a string can be crafted to read one way here and another to the parser.
 * The guarantee is Layer 3 — the llm_reader role, which holds SELECT on exactly
 * one table. This layer exists to reject obvious abuse early, with an error
 * message the model can act on, and to keep the blast radius small if Layer 3
 * is ever misconfigured. Neither layer is sufficient alone.
 */
@Injectable()
export class SqlValidatorService {
  validate(sql: string): void {
    const trimmed = (sql ?? '').trim();

    /**
     * Every rule below runs against a copy with the *contents* of string
     * literals removed. Without this, `WHERE company = 'Drop Inc'` would trip
     * the DROP keyword rule and a legitimate question about a real company
     * would fail. The doubled-quote alternation keeps escaped quotes ('') from
     * ending a literal early.
     */
    const scan = trimmed.replace(/'(?:[^']|'')*'/g, "''");
    const lower = scan.toLowerCase();

    // 1. Read-only entry points only.
    if (!/^(SELECT|WITH)\b/i.test(scan)) {
      throw new BadRequestException('Query must start with SELECT or WITH');
    }

    // 2. No statement that could write. Word boundaries keep `date_trunc` and
    //    `created_at` from matching TRUNCATE and CREATE.
    for (const keyword of BLOCKED_KEYWORDS) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(scan)) {
        throw new BadRequestException(`Blocked keyword detected: ${keyword}`);
      }
    }

    // 3. One statement only, so nothing can ride along after a semicolon.
    //    A single trailing semicolon is tolerated.
    const statements = scan.split(';').filter((part) => part.trim().length > 0);
    if (statements.length > 1) {
      throw new BadRequestException('Multiple SQL statements are not allowed');
    }

    // 4. The only table this app answers questions from.
    if (!lower.includes(REQUIRED_TABLE)) {
      throw new BadRequestException(
        'Query must reference the financial_data table',
      );
    }

    // 5. Catalog and application tables are off limits even in a JOIN or UNION,
    //    which is how an exfiltration attempt would still satisfy rule 4.
    for (const table of BLOCKED_TABLES) {
      if (lower.includes(table)) {
        throw new BadRequestException(`Access to ${table} is not allowed`);
      }
    }

    // 6. Comments can hide a second reading of the query from a human reviewer.
    if (scan.includes('--') || scan.includes('/*')) {
      throw new BadRequestException('SQL comments are not allowed');
    }
  }
}
