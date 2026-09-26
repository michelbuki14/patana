import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthController } from './auth/auth.controller';
import { MediaController } from './media/media.controller';
import { AuthService } from './auth/auth.service';
import { MediaService } from './media/media.service';
import { NotificationsService } from './notifications/notifications.service';
import { EventBusService } from './event-bus/event-bus.service';
import { HealthModule } from './health/health.module';

@Module({
  imports: [PrismaModule, HealthModule],
  controllers: [AuthController, MediaController],
  providers: [AuthService, MediaService, NotificationsService, EventBusService],
  exports: [AuthService, MediaService, NotificationsService, EventBusService, PrismaModule],
})
export class SharedModule {}
