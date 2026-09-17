import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { EventBusService } from './event-bus/event-bus.service';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { NotificationsService } from './notifications/notifications.service';
import { HealthModule } from './health/health.module';

@Module({
  controllers: [AuthController, MediaController],
  imports: [HealthModule],
  providers: [AuthService, EventBusService, MediaService, NotificationsService],
  exports: [EventBusService, MediaService, NotificationsService, AuthService],
})
export class SharedModule {}
