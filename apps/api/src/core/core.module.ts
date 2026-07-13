import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggingService } from './logger/logging.service';
import { HealthController } from './controllers/health.controller';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
    }),
  ],
  controllers: [HealthController],
  providers: [LoggingService],
  exports: [LoggingService, ConfigModule],
})
export class CoreModule {}
