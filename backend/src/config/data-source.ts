import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

// The TypeORM CLI runs outside Nest, so it never sees ConfigModule. Load the
// same root .env by hand. dotenv does not overwrite variables that are already
// set, so a real environment (Render) still wins over any file.
loadEnv({ path: join(process.cwd(), '..', '.env') });
loadEnv({ path: join(process.cwd(), '.env') });

/**
 * CLI-only DataSource, used by the migration:* scripts. The running app builds
 * its own connection from ConfigModule in app.module.ts — this file exists
 * because the CLI needs a DataSource it can import directly.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  synchronize: false,
});
