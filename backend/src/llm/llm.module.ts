import Anthropic from '@anthropic-ai/sdk';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinancialModule } from '../financial/financial.module';
import { ANTHROPIC_CLIENT } from './llm.constants';
import { LlmService } from './llm.service';
import { PromptBuilderService } from './services/prompt-builder.service';

@Module({
  imports: [FinancialModule],
  providers: [
    LlmService,
    PromptBuilderService,
    {
      // Behind a token so tests can hand the service a scripted client instead
      // of reaching the network.
      provide: ANTHROPIC_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Anthropic({
          apiKey: config.getOrThrow<string>('ANTHROPIC_API_KEY'),
          // The SDK already retries 429 and 5xx with backoff; two is plenty for
          // a request a user is waiting on.
          maxRetries: 2,
        }),
    },
  ],
  exports: [LlmService, PromptBuilderService],
})
export class LlmModule {}
