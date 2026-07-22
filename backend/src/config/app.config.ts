import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
}

export default registerAs('app', (): AppConfig => {
  const raw = process.env.CORS_ORIGIN ?? '';
  const corsOrigins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // A wildcard origin would let any site on the internet drive this API on a
  // visitor's behalf. Joi cannot express "anything but '*'" as clearly as this,
  // so the check lives here — at boot, where it still fails fast.
  if (corsOrigins.includes('*')) {
    throw new Error(
      'CORS_ORIGIN must list explicit origins; "*" is not allowed.',
    );
  }
  if (corsOrigins.length === 0) {
    throw new Error('CORS_ORIGIN must contain at least one origin.');
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    corsOrigins,
  };
});
