import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
