import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  poolSize: number;
  ssl: boolean;
  llmReaderUser: string;
  llmReaderPassword: string;
}

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    host: process.env.DATABASE_HOST as string,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER as string,
    password: process.env.DATABASE_PASSWORD as string,
    database: process.env.DATABASE_NAME as string,
    poolSize: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    ssl: process.env.DATABASE_SSL === 'true',
    // Credentials for the second connection. Same host and database as above —
    // only the role differs, and that difference is the entire guardrail.
    llmReaderUser: process.env.LLM_READER_USER as string,
    llmReaderPassword: process.env.LLM_READER_PASSWORD as string,
  }),
);
