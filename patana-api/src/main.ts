import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(){
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Patana API listening on http://localhost:${port}/api`);
}
void bootstrap();
