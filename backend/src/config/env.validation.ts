import * as Joi from 'joi';

/**
 * Every environment variable the app depends on, validated once at boot.
 *
 * The point is to fail at startup rather than at the first request that needs a
 * missing value — a chat app that boots fine and then throws on the first
 * question is harder to diagnose than one that refuses to start.
 *
 * Keep in sync with .env.example.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_POOL_SIZE: Joi.number().integer().min(1).default(10),
  // Managed Postgres (Neon, Supabase, Render) requires TLS; a local container
  // does not offer it. False by default so `docker compose up` works untouched.
  DATABASE_SSL: Joi.boolean().default(false),

  // Credentials for the SELECT-only role that runs LLM-authored SQL. Required
  // here even though nothing reads them until the financial module exists, so a
  // deployment missing them is caught on day one instead of at first query.
  LLM_READER_USER: Joi.string().required(),
  LLM_READER_PASSWORD: Joi.string().required(),

  ANTHROPIC_API_KEY: Joi.string().required(),
  ANTHROPIC_MODEL: Joi.string().default('claude-sonnet-5'),

  // Comma-separated allowlist. '*' is rejected outright rather than merely
  // discouraged — see app.config.ts.
  CORS_ORIGIN: Joi.string().required(),
});
