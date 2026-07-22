import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlValidatorService } from '../llm/services/sql-validator.service';
import {
  LLM_READER_CONNECTION,
  STATEMENT_TIMEOUT_MS,
} from './financial.constants';
import { FinancialData } from './entities/financial-data.entity';
import { FinancialService } from './financial.service';

@Module({
  imports: [
    /**
     * A second connection to the same database, logged in as a different role.
     *
     * Keeping it separate from the application connection is the point: the app
     * connection owns the schema and can write, so if model-authored SQL ever
     * ran on it, no amount of string validation would matter.
     */
    TypeOrmModule.forRootAsync({
      name: LLM_READER_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        name: LLM_READER_CONNECTION,
        type: 'postgres' as const,
        host: config.getOrThrow<string>('database.host'),
        port: config.getOrThrow<number>('database.port'),
        username: config.getOrThrow<string>('database.llmReaderUser'),
        password: config.getOrThrow<string>('database.llmReaderPassword'),
        database: config.getOrThrow<string>('database.database'),
        entities: [FinancialData],
        synchronize: false,
        // Never run migrations on this connection — it has no rights to, and
        // asking would fail noisily at boot.
        migrationsRun: false,
        extra: {
          // Enforced by Postgres, so it also covers a query that gets past the
          // validator. This is what cancels pg_sleep(10).
          statement_timeout: STATEMENT_TIMEOUT_MS,
          // A small pool: this connection serves one query per chat turn.
          max: 5,
          application_name: 'financial-chat-llm-reader',
        },
      }),
    }),
  ],
  providers: [
    FinancialService,
    // Provided here rather than in an LLM module on purpose. The validator has
    // no dependencies, and registering it where it is consumed keeps the LLM
    // module free to depend on this one in the next phase without a cycle.
    SqlValidatorService,
  ],
  exports: [FinancialService, SqlValidatorService],
})
export class FinancialModule {}
