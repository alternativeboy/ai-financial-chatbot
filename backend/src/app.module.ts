import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from './chat/chat.module';
import { ConfigModule } from './config/config.module';
import { FinancialModule } from './financial/financial.module';
import { HealthModule } from './health/health.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.getOrThrow<string>('database.host'),
        port: config.getOrThrow<number>('database.port'),
        username: config.getOrThrow<string>('database.username'),
        password: config.getOrThrow<string>('database.password'),
        database: config.getOrThrow<string>('database.database'),
        poolSize: config.getOrThrow<number>('database.poolSize'),
        autoLoadEntities: true,
        // Locked decision: schema changes go through migrations, never sync.
        // financial_data holds the only copy of the dataset, and synchronize
        // would let a stray entity definition rewrite or drop it on boot.
        synchronize: false,
      }),
    }),
    HealthModule,
    ChatModule,
    FinancialModule,
    LlmModule,
  ],
})
export class AppModule {}
