import type Anthropic from '@anthropic-ai/sdk';

/**
 * The only tool the model is given.
 *
 * One tool, one table. Every factual claim the assistant makes has to come back
 * through here, which is what makes "did this number come from the database?"
 * a question with a checkable answer.
 */
export const EXECUTE_SQL_TOOL: Anthropic.Tool = {
  name: 'execute_sql',
  description:
    'Execute a read-only SQL SELECT query against the financial_data table in PostgreSQL. ' +
    'The table contains income-statement data (company, ticker, sector, year, revenue, ' +
    'net_income, operating_income, gross_profit) for 49 U.S. public companies from 2022 to 2025. ' +
    'All monetary values are in USD (BIGINT). Some values may be NULL.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'A PostgreSQL SELECT query against the financial_data table. Must be a single SELECT ' +
          'statement. Examples: "SELECT company, revenue FROM financial_data WHERE year = 2024 ' +
          'ORDER BY revenue DESC LIMIT 5", "SELECT year, net_income FROM financial_data WHERE ticker = \'AAPL\'"',
      },
    },
    required: ['query'],
  },
};
