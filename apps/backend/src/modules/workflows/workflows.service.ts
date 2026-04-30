import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getPaginationParams, buildPaginatedResult } from '../../common/utils/pagination.util';
import { TaskStatus, TaskPriority, ApprovalStatus } from '@prisma/client';
import {
  IsString, IsOptional, IsEnum, IsDateString, IsArray, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional({ example: '2025-06-15' }) @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() caseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
}

export class CreateApprovalDto {
  @ApiProperty({ example: 'QUOTATION_DISCOUNT' }) @IsString() type: string;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() approverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resourceId?: string;
}

export class CreateReminderDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
  @ApiProperty({ example: '2025-06-10T09:00:00' }) @IsDateString() remindAt: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resourceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
}

export interface QueryTasksDto {
  page?: number; limit?: number;
  status?: TaskStatus; priority?: TaskPriority;
  assignedToId?: string; caseId?: string; overdue?: string;
}

const TASK_SELECT = {
  id: true, tenantId: true, title: true, description: true,
  status: true, priority: true, dueDate: true, completedAt: true,
  caseId: true, clientId: true, leadId: true, tags: true, notes: true,
  assignedToId: true, createdById: true, createdAt: true, updatedAt: true,
  assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async createTask(tenantId: string, dto: CreateTaskDto, createdById?: string) {
    return this.prisma.task.create({
      data: {
        tenantId,
        title: dto.title, description: dto.description,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId: dto.assignedToId, createdById,
        caseId: dto.caseId, clientId: dto.clientId, leadId: dto.leadId,
        notes: dto.notes, tags: dto.tags ?? [],
      },
      select: TASK_SELECT,
    });
  }

  async findTasks(tenantId: string, query: QueryTasksDto) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const now = new Date();

    const where = {
      tenantId,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...(query.caseId && { caseId: query.caseId }),
      ...(query.overdue === 'true' && { dueDate: { lt: now }, status: { not: TaskStatus.DONE } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({ where, skip, take, orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }], select: TASK_SELECT }),
      this.prisma.task.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getMyTasks(tenantId: string, userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekFromNow = new Date(Date.now() + 7 * 86400000);

    const [todo, overdue, dueToday, dueSoon] = await Promise.all([
      this.prisma.task.count({ where: { tenantId, assignedToId: userId, status: TaskStatus.TODO } }),
      this.prisma.task.count({ where: { tenantId, assignedToId: userId, status: { not: TaskStatus.DONE }, dueDate: { lt: now } } }),
      this.prisma.task.findMany({ where: { tenantId, assignedToId: userId, status: { not: TaskStatus.DONE }, dueDate: { gte: todayStart, lte: todayEnd } }, select: TASK_SELECT }),
      this.prisma.task.findMany({ where: { tenantId, assignedToId: userId, status: { not: TaskStatus.DONE }, dueDate: { gt: now, lte: weekFromNow } }, orderBy: { dueDate: 'asc' }, take: 10, select: TASK_SELECT }),
    ]);
    return { todo, overdue, dueToday, dueSoon };
  }

  async updateTask(tenantId: string, id: string, dto: Partial<CreateTaskDto> & { status?: TaskStatus }) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        status: dto.status,
        notes: dto.notes,
        tags: dto.tags,
        assignedToId: dto.assignedToId,
        caseId: dto.caseId,
        clientId: dto.clientId,
        leadId: dto.leadId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        ...(dto.status === TaskStatus.DONE && { completedAt: new Date() }),
        ...(dto.status && dto.status !== TaskStatus.DONE && { completedAt: null as Date | null }),
      },
      select: TASK_SELECT,
    });
  }

  async completeTask(tenantId: string, id: string) {
    return this.updateTask(tenantId, id, { status: TaskStatus.DONE });
  }

  async deleteTask(tenantId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.prisma.task.delete({ where: { id } });
  }

  // ── Approvals ──────────────────────────────────────────────────────────────

  async createApproval(tenantId: string, dto: CreateApprovalDto, requestedById?: string) {
    return this.prisma.approval.create({
      data: {
        tenantId, type: dto.type, title: dto.title, description: dto.description,
        approverId: dto.approverId, requestedById,
        resourceType: dto.resourceType, resourceId: dto.resourceId,
      },
    });
  }

  async getPendingApprovals(tenantId: string, approverId?: string) {
    return this.prisma.approval.findMany({
      where: { tenantId, status: ApprovalStatus.PENDING, ...(approverId && { approverId }) },
      orderBy: { requestedAt: 'asc' },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async decide(tenantId: string, id: string, approved: boolean, notes?: string, userId?: string) {
    const approval = await this.prisma.approval.findFirst({ where: { id, tenantId } });
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.status !== ApprovalStatus.PENDING) throw new ForbiddenException('Approval already decided');
    if (approval.approverId && approval.approverId !== userId) throw new ForbiddenException('Not authorized to decide this approval');

    return this.prisma.approval.update({
      where: { id },
      data: {
        status: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        decidedAt: new Date(),
        notes,
        ...(!approved && notes && { rejectedReason: notes }),
      },
    });
  }

  // ── Reminders ──────────────────────────────────────────────────────────────

  async createReminder(tenantId: string, dto: CreateReminderDto, userId?: string) {
    return this.prisma.reminder.create({
      data: {
        tenantId, title: dto.title, message: dto.message,
        remindAt: new Date(dto.remindAt),
        resourceType: dto.resourceType, resourceId: dto.resourceId,
        userId: dto.userId ?? userId,
      },
    });
  }

  async getUpcomingReminders(tenantId: string, userId: string) {
    return this.prisma.reminder.findMany({
      where: { tenantId, userId, isDone: false, remindAt: { gte: new Date() } },
      orderBy: { remindAt: 'asc' },
      take: 20,
    });
  }

  async getDueReminders(tenantId: string, userId: string) {
    return this.prisma.reminder.findMany({
      where: { tenantId, userId, isDone: false, remindAt: { lte: new Date() } },
      orderBy: { remindAt: 'asc' },
    });
  }

  async markReminderDone(tenantId: string, id: string) {
    const r = await this.prisma.reminder.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Reminder not found');
    return this.prisma.reminder.update({ where: { id }, data: { isDone: true, doneAt: new Date() } });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getWorkflowStats(tenantId: string, userId: string) {
    const now = new Date();
    const [tasksByStatus, overdueCount, pendingApprovals, dueReminders] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], where: { tenantId, assignedToId: userId }, _count: true }),
      this.prisma.task.count({ where: { tenantId, assignedToId: userId, status: { not: TaskStatus.DONE }, dueDate: { lt: now } } }),
      this.prisma.approval.count({ where: { tenantId, approverId: userId, status: ApprovalStatus.PENDING } }),
      this.prisma.reminder.count({ where: { tenantId, userId, isDone: false, remindAt: { lte: now } } }),
    ]);
    return { tasksByStatus, overdueCount, pendingApprovals, dueReminders };
  }
}
