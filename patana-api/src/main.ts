import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') || 3001;
  app.enableCors();
  app.setGlobalPrefix('api');
  await app.listen(port);
  console.log(`Patana API listening on http://localhost:${port}/api`);
}
void bootstrap();
