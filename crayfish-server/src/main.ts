import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Crayfish Backend is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
