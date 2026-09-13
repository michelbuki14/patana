import { Module, Global } from '@nestjs/common';
import { EventBusService } from './event-bus/event-bus.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { MediaService } from './media/media.service';
import { MediaController } from './media/media.controller';
import { NotificationsService } from './notifications/notifications.service';

@Global()
@Module({
  controllers: [AuthController, MediaController],
  providers: [EventBusService, AuthService, MediaService, NotificationsService],
  exports: [EventBusService, AuthService, MediaService],
})
export class SharedModule {}
