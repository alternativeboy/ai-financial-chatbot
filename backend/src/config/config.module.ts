import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { join } from 'path';
import appConfig from './app.config';
import databaseConfig from './database.config';
import { envValidationSchema } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig],
      // A single .env at the repo root serves both backend and tooling, so look
      // one level up from backend/ first. In production (Render) no file exists
      // and real environment variables are used instead — which is why a missing
      // file is not an error.
      envFilePath: [
        join(process.cwd(), '..', '.env'),
        join(process.cwd(), '.env'),
      ],
      validationSchema: envValidationSchema,
      // Report every invalid variable at once; fixing them one boot at a time is
      // needless friction.
      validationOptions: { abortEarly: false },
    }),
  ],
})
export class ConfigModule {}
