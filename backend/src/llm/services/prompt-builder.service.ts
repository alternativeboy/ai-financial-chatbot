import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SYSTEM_PROMPT_TEMPLATE } from '../constants/system-prompt';

/** The eight columns the prompt, the validator and the GRANT all assume. */
export const EXPECTED_COLUMNS = [
  'company',
  'ticker',
  'sector',
  'year',
  'revenue',
  'net_income',
  'operating_income',
  'gross_profit',
] as const;

@Injectable()
export class PromptBuilderService implements OnModuleInit {
  private readonly logger = new Logger(PromptBuilderService.name);
  private systemPrompt: string | null = null;

  /**
   * Uses the application connection, not llm_reader. These queries are written
   * by the app and are trusted; llm_reader deliberately cannot see
   * information_schema at all.
   */
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.assertSchemaMatches();
    this.systemPrompt = await this.buildSystemPrompt();
  }

  getSystemPrompt(): string {
    if (!this.systemPrompt) {
      throw new Error('System prompt requested before initialisation');
    }
    return this.systemPrompt;
  }

  /**
   * Refuses to boot if financial_data does not have exactly the expected
   * columns.
   *
   * A changed column is not a data problem that a reload fixes — it invalidates
   * the validator's allowlist, the GRANT, and the schema block in the prompt at
   * once. Failing at startup surfaces that as one obvious error instead of as
   * confidently wrong answers later.
   */
  private async assertSchemaMatches(): Promise<void> {
    const rows: { column_name: string }[] = await this.dataSource.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'financial_data'`,
    );

    const actual = new Set(rows.map((row) => row.column_name));
    const expected = new Set<string>(EXPECTED_COLUMNS);

    const missing = [...expected].filter((column) => !actual.has(column));
    const unexpected = [...actual].filter((column) => !expected.has(column));

    if (rows.length === 0) {
      throw new Error(
        'financial_data table not found — did the Postgres init scripts run?',
      );
    }
    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        `financial_data schema mismatch. Missing: [${missing.join(', ')}]. ` +
          `Unexpected: [${unexpected.join(', ')}]. ` +
          'Update the validator allowlist, the llm_reader GRANT and the system prompt together.',
      );
    }
  }

  private async buildSystemPrompt(): Promise<string> {
    const [years, sectors, totals] = await Promise.all([
      this.dataSource.query(
        `SELECT DISTINCT year FROM financial_data ORDER BY year`,
      ) as Promise<{ year: number }[]>,
      this.dataSource.query(
        `SELECT sector, array_agg(DISTINCT company ORDER BY company) AS companies
         FROM financial_data GROUP BY sector ORDER BY sector`,
      ) as Promise<{ sector: string; companies: string[] }[]>,
      this.dataSource.query(
        `SELECT COUNT(DISTINCT company)::int AS companies, COUNT(*)::int AS rows
         FROM financial_data`,
      ) as Promise<{ companies: number; rows: number }[]>,
    ]);

    const yearValues = years.map((row) => Number(row.year));
    const yearList = yearValues.join(', ');
    const yearRange = `${yearValues[0]}-${yearValues[yearValues.length - 1]}`;
    const { companies, rows } = totals[0];

    const coverageBlock = [
      `Coverage: ${companies} U.S. public companies across ${sectors.length} sectors, ` +
        `fiscal years ${yearRange}. Total rows: ${rows}.`,
      '',
      '## Companies Available',
      ...sectors.map(
        (entry) => `${entry.sector}: ${entry.companies.join(', ')}`,
      ),
    ].join('\n');

    this.logger.log(
      `Prompt coverage: ${companies} companies, ${sectors.length} sectors, ` +
        `${yearRange}, ${rows} rows`,
    );

    return SYSTEM_PROMPT_TEMPLATE.replace('{{COVERAGE_BLOCK}}', coverageBlock)
      .replace('{{YEAR_LIST}}', yearList)
      .replaceAll('{{YEAR_RANGE}}', yearRange);
  }
}
