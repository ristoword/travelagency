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

  @Get('list')
  @ApiOperation({ summary: 'List notification items (overdue tasks, pending approvals, due reminders)' })
  async getList(@CurrentUser() user: JwtPayload) {
    const now = new Date();

    const [overdueTasks, pendingApprovals, dueReminders] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          tenantId: user.tenantId,
          assignedToId: user.sub,
          status: { not: TaskStatus.DONE },
          dueDate: { lt: now },
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          caseId: true,
          clientId: true,
          leadId: true,
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.approval.findMany({
        where: {
          tenantId: user.tenantId,
          approverId: user.sub,
          status: ApprovalStatus.PENDING,
        },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          resourceType: true,
          resourceId: true,
          requestedAt: true,
        },
        orderBy: { requestedAt: 'asc' },
      }),
      this.prisma.reminder.findMany({
        where: {
          tenantId: user.tenantId,
          userId: user.sub,
          isDone: false,
          remindAt: { lte: now },
        },
        select: {
          id: true,
          title: true,
          message: true,
          remindAt: true,
          resourceType: true,
          resourceId: true,
        },
        orderBy: { remindAt: 'asc' },
      }),
    ]);

    return [
      ...overdueTasks.map((t) => ({ ...t, notificationType: 'OVERDUE_TASK' as const })),
      ...pendingApprovals.map((a) => ({ ...a, notificationType: 'PENDING_APPROVAL' as const })),
      ...dueReminders.map((r) => ({ ...r, notificationType: 'DUE_REMINDER' as const })),
    ];
  }
}
