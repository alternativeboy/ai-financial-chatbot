import { BadRequestException } from '@nestjs/common';
import { SqlValidatorService } from './sql-validator.service';

/**
 * The highest-value tests in this repository.
 *
 * Layer 2 is the control a reader looks at to decide whether the app is safe,
 * so every case the spec calls out is written here explicitly rather than
 * folded into a loop — a failure should name the attack it let through.
 */
describe('SqlValidatorService', () => {
  const validator = new SqlValidatorService();
  const reject = (sql: string) => () => validator.validate(sql);

  describe('rejects', () => {
    it('a stacked statement', () => {
      expect(
        reject("SELECT * FROM financial_data; DROP TABLE financial_data"),
      ).toThrow(BadRequestException);
    });

    it('a stacked statement with no blocked keyword in it', () => {
      expect(reject('SELECT company FROM financial_data; SELECT 1')).toThrow(
        'Multiple SQL statements are not allowed',
      );
    });

    it('a line comment', () => {
      expect(
        reject('SELECT company FROM financial_data -- everything after this'),
      ).toThrow('SQL comments are not allowed');
    });

    it('a block comment', () => {
      expect(
        reject('SELECT company /* sneaky */ FROM financial_data'),
      ).toThrow('SQL comments are not allowed');
    });

    it('pg_sleep as a denial-of-service attempt', () => {
      expect(reject('SELECT pg_sleep(10) FROM financial_data')).toThrow(
        'Access to pg_ is not allowed',
      );
    });

    it('the information schema', () => {
      expect(
        reject('SELECT table_name FROM information_schema.tables'),
      ).toThrow(BadRequestException);
    });

    it('an application table read directly', () => {
      expect(reject('SELECT * FROM messages')).toThrow(BadRequestException);
    });

    it('an application table reached through a JOIN', () => {
      expect(
        reject(
          'SELECT f.company, c.title FROM financial_data f JOIN conversations c ON true',
        ),
      ).toThrow('Access to conversations is not allowed');
    });

    it('exfiltration through UNION, which still satisfies the required-table rule', () => {
      expect(
        reject(
          'SELECT company FROM financial_data UNION SELECT table_name FROM information_schema.tables',
        ),
      ).toThrow('Access to information_schema is not allowed');
    });

    it('a mixed-case keyword', () => {
      expect(
        reject("InSeRt INTO financial_data VALUES ('x','X','Tech',2024,1,1,1,1)"),
      ).toThrow('Query must start with SELECT or WITH');
    });

    it('a mixed-case keyword hidden mid-query', () => {
      expect(
        reject('SELECT * FROM financial_data WHERE 1=1 UnIoN dElEtE FROM x'),
      ).toThrow('Blocked keyword detected: DELETE');
    });

    it('a query that never touches financial_data', () => {
      expect(reject('SELECT 1')).toThrow(
        'Query must reference the financial_data table',
      );
    });

    it('a query whose only mention of the table is inside a string', () => {
      expect(reject("SELECT 'financial_data' AS label")).toThrow(
        'Query must reference the financial_data table',
      );
    });

    it('an empty query', () => {
      expect(reject('   ')).toThrow('Query must start with SELECT or WITH');
    });
  });

  describe('accepts', () => {
    const accept = (sql: string) => expect(reject(sql)).not.toThrow();

    it('a plain projection', () => {
      accept(
        "SELECT company, revenue FROM financial_data WHERE ticker = 'AAPL'",
      );
    });

    it('a CTE', () => {
      accept(`
        WITH ranked AS (
          SELECT company, revenue FROM financial_data WHERE year = 2024
        )
        SELECT * FROM ranked ORDER BY revenue DESC LIMIT 5
      `);
    });

    it('an aggregate with GROUP BY, ORDER BY and LIMIT', () => {
      accept(
        'SELECT sector, avg(net_income) FROM financial_data GROUP BY sector ORDER BY 2 DESC LIMIT 10',
      );
    });

    it('a trailing semicolon', () => {
      accept('SELECT company FROM financial_data;');
    });

    // The reason the whole scan runs on a literal-stripped copy: these are real
    // questions a user could ask, and each contains a blocked word.
    it('a company name that contains a blocked keyword', () => {
      accept("SELECT revenue FROM financial_data WHERE company = 'Drop Inc'");
    });

    it('a string containing a table name from the blocklist', () => {
      accept(
        "SELECT company FROM financial_data WHERE company = 'Messages Ltd'",
      );
    });

    it('a string containing what looks like a comment', () => {
      accept("SELECT company FROM financial_data WHERE company = 'A -- B'");
    });

    it('a string containing an escaped quote', () => {
      accept(
        "SELECT revenue FROM financial_data WHERE company = 'McDonald''s'",
      );
    });

    it('column names that merely contain blocked keywords as substrings', () => {
      accept(
        'SELECT date_trunc(?year?, now()) FROM financial_data'.replace(/\?/g, "'"),
      );
    });
  });
});
