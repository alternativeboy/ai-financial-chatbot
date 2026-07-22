import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  LLM_READER_CONNECTION,
  MAX_RESULT_ROWS,
} from '../src/financial/financial.constants';
import { FinancialService } from '../src/financial/financial.service';

describe('SQL guardrails (e2e)', () => {
  let app: INestApplication;
  let financial: FinancialService;
  let llmReader: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    financial = app.get(FinancialService);
    llmReader = app.get<DataSource>(
      getDataSourceToken(LLM_READER_CONNECTION),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Layer 3 — the llm_reader role, tested without the validator', () => {
    // These go straight to the connection, bypassing FinancialService entirely.
    // That is the point: if Layer 2 were deleted tomorrow, these must still fail.

    it('connects as llm_reader, not as the application user', async () => {
      const [{ current_user: role }] = await llmReader.query(
        'SELECT current_user',
      );
      expect(role).toBe('llm_reader');
    });

    it('can read financial_data', async () => {
      const [{ count }] = await llmReader.query(
        'SELECT count(*)::int AS count FROM financial_data',
      );
      expect(count).toBe(192);
    });

    it('cannot INSERT', async () => {
      await expect(
        llmReader.query(
          `INSERT INTO financial_data (company, ticker, sector, year)
           VALUES ('Fake', 'FAKE', 'Technology', 2024)`,
        ),
      ).rejects.toThrow(/permission denied/i);
    });

    it('cannot UPDATE or DELETE', async () => {
      await expect(
        llmReader.query('UPDATE financial_data SET revenue = 0'),
      ).rejects.toThrow(/permission denied/i);
      await expect(
        llmReader.query('DELETE FROM financial_data'),
      ).rejects.toThrow(/permission denied/i);
    });

    it('cannot read the conversation tables', async () => {
      await expect(
        llmReader.query('SELECT * FROM conversations'),
      ).rejects.toThrow(/permission denied/i);
      await expect(llmReader.query('SELECT * FROM messages')).rejects.toThrow(
        /permission denied/i,
      );
    });

    it('cannot create objects of its own', async () => {
      await expect(
        llmReader.query('CREATE TABLE exfiltrated (x int)'),
      ).rejects.toThrow(/permission denied/i);
    });

    it('carries a 5 second statement timeout', async () => {
      const [{ statement_timeout: timeout }] = await llmReader.query(
        'SHOW statement_timeout',
      );
      expect(timeout).toBe('5s');
    });

    it('cancels a long-running query rather than hanging', async () => {
      // pg_sleep(10) against a 5s timeout. Layer 2 would have rejected this on
      // the pg_ rule; the database rejects it regardless.
      await expect(llmReader.query('SELECT pg_sleep(10)')).rejects.toThrow(
        /statement timeout|canceling statement/i,
      );
    });
  });

  describe('Layer 2 + Layer 3 together, through FinancialService', () => {
    it('answers a legitimate question with the figure from the database', async () => {
      const result = await financial.execute(
        "SELECT net_income FROM financial_data WHERE company = 'Apple' AND year = 2023",
      );

      expect(result.rowCount).toBe(1);
      expect(result.truncated).toBe(false);
      // The number scenario S1 requires the model to reproduce exactly.
      expect(String(result.rows[0].net_income)).toBe('96995000000');
    });

    it('supports the query shapes the model actually writes', async () => {
      const ranking = await financial.execute(
        'SELECT company, revenue FROM financial_data WHERE year = 2024 ORDER BY revenue DESC NULLS LAST LIMIT 5',
      );
      expect(ranking.rowCount).toBe(5);

      const grouped = await financial.execute(
        'SELECT sector, avg(net_income) AS avg_income FROM financial_data GROUP BY sector',
      );
      expect(grouped.rowCount).toBe(5);

      const cte = await financial.execute(`
        WITH tech AS (SELECT company, revenue FROM financial_data WHERE sector = 'Technology')
        SELECT count(*) AS n FROM tech
      `);
      expect(cte.rowCount).toBe(1);
    });

    it('refuses a write before it reaches the database', async () => {
      await expect(
        financial.execute("INSERT INTO financial_data VALUES ('x')"),
      ).rejects.toThrow('Query must start with SELECT or WITH');
    });

    it('refuses to read the conversation tables', async () => {
      await expect(
        financial.execute(
          'SELECT f.company FROM financial_data f JOIN messages m ON true',
        ),
      ).rejects.toThrow('Access to messages is not allowed');
    });

    it('caps a runaway result and reports that it did', async () => {
      // A two-way self join is 36,864 rows — comfortably over the cap.
      const result = await financial.execute(
        'SELECT a.company, b.year FROM financial_data a, financial_data b',
      );

      expect(result.rowCount).toBe(MAX_RESULT_ROWS);
      expect(result.rows).toHaveLength(MAX_RESULT_ROWS);
      expect(result.truncated).toBe(true);
    });

    it('does not flag truncation for a result sitting exactly on the cap', async () => {
      // The table itself is only 192 rows, so landing exactly on the boundary
      // needs a join. This is the off-by-one case: 200 rows available, 201
      // requested, so truncated must stay false.
      const result = await financial.execute(
        `SELECT a.company FROM financial_data a, financial_data b LIMIT ${MAX_RESULT_ROWS}`,
      );

      expect(result.rowCount).toBe(MAX_RESULT_ROWS);
      expect(result.truncated).toBe(false);
    });

    it('does not flag truncation when the whole table fits', async () => {
      const result = await financial.execute('SELECT company FROM financial_data');

      expect(result.rowCount).toBe(192);
      expect(result.truncated).toBe(false);
    });
  });
});
