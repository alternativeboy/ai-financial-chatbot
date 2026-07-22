import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  poolSize: number;
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
  }),
);
