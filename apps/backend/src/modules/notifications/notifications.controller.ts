import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtPayload } from '../../core/auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../database/prisma.service';
import { TaskStatus, ApprovalStatus } from '@prisma/client';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count (overdue tasks + pending approvals + due reminders)' })
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    const now = new Date();

    const [overdueTasks, pendingApprovals, dueReminders] = await Promise.all([
      this.prisma.task.count({
        where: {
          tenantId: user.tenantId,
          assignedToId: user.sub,
          status: { not: TaskStatus.DONE },
          dueDate: { lt: now },
        },
      }),
      this.prisma.approval.count({
        where: {
          tenantId: user.tenantId,
          approverId: user.sub,
          status: ApprovalStatus.PENDING,
        },
      }),
      this.prisma.reminder.count({
        where: {
          tenantId: user.tenantId,
          userId: user.sub,
          isDone: false,
          remindAt: { lte: now },
        },
      }),
    ]);

    const unreadCount = overdueTasks + pendingApprovals + dueReminders;
    return { unreadCount, overdueTasks, pendingApprovals, dueReminders };
  }
}
