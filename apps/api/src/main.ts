import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingService } from './core/logger/logging.service';
import { globalValidationPipe } from './core/pipes/validation.pipe';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggingService);
  app.useLogger(logger);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Register global validation pipe and exception filter
  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Swagger integration
  const config = new DocumentBuilder()
    .setTitle('Property Management System API')
    .setDescription('The API core documentation for Property Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger API Docs available at: http://localhost:${port}/swagger`);
}
bootstrap();
