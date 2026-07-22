import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string[]>('app.corsOrigins'),
    // X-Session-Id is how a browser claims a conversation, so it has to survive
    // the preflight check.
    allowedHeaders: ['Content-Type', 'X-Session-Id'],
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Bind on every interface, not just loopback. A platform like Render reaches
  // the container from outside, so a loopback-only bind looks identical to a
  // dead process: the port never answers and the health check just times out.
  const port = config.getOrThrow<number>('app.port');
  await app.listen(port, '0.0.0.0');

  // Printed last, after every module has initialised. If this line is missing
  // from the logs, the process never got as far as listening — look at what ran
  // before it rather than at the network.
  new Logger('Bootstrap').log(`Listening on 0.0.0.0:${port}`);
}

void bootstrap();
