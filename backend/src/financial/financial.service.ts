import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SqlValidatorService } from '../llm/services/sql-validator.service';
import { LLM_READER_CONNECTION, MAX_RESULT_ROWS } from './financial.constants';

export interface SqlExecutionResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  /** True when the query had more rows than the cap and the tail was dropped. */
  truncated: boolean;
}

@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name);

  constructor(
    @InjectDataSource(LLM_READER_CONNECTION)
    private readonly dataSource: DataSource,
    private readonly validator: SqlValidatorService,
  ) {}

  /**
   * Runs a query the model wrote, through both guardrail layers.
   *
   * Layer 2 (the validator) rejects obvious abuse with a message the model can
   * act on. Layer 3 is this connection: it is logged in as llm_reader, which
   * holds SELECT on financial_data and nothing else. A statement that talks its
   * way past the validator still cannot write, and still cannot read the
   * conversation tables.
   */
  async execute(sql: string): Promise<SqlExecutionResult> {
    this.validator.validate(sql);

    // The cap is applied by wrapping rather than by slicing the result, so the
    // database stops producing rows at the limit. Slicing afterwards would mean
    // transferring and materialising every row of a cross join first.
    //
    // One extra row is requested purely to distinguish "exactly at the cap"
    // from "there was more".
    const inner = sql.trim().replace(/;\s*$/, '');
    const capped = `SELECT * FROM (${inner}) AS llm_query LIMIT ${MAX_RESULT_ROWS + 1}`;

    const rows: Record<string, unknown>[] = await this.dataSource.query(capped);
    const truncated = rows.length > MAX_RESULT_ROWS;
    const page = truncated ? rows.slice(0, MAX_RESULT_ROWS) : rows;

    if (truncated) {
      this.logger.warn(
        `Query exceeded ${MAX_RESULT_ROWS} rows and was truncated`,
      );
    }

    return { rows: page, rowCount: page.length, truncated };
  }
}
