import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  WorkflowsService,
  CreateTaskDto, CreateApprovalDto, CreateReminderDto, QueryTasksDto,
} from './workflows.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { TaskStatus } from '@prisma/client';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class DecideApprovalDto {
  @ApiPropertyOptional() approved: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@ApiTags('Workflows')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'workflows', version: '1' })
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  // Tasks
  @Post('tasks')
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Create task (assignable to any user, linkable to case/client/lead)' })
  createTask(@Body() dto: CreateTaskDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.createTask(user.tenantId, dto, user.sub);
  }

  @Get('tasks')
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'List tasks with filters (status, priority, assignee, overdue)' })
  findTasks(@Query() query: QueryTasksDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findTasks(user.tenantId, query);
  }

  @Get('tasks/mine')
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'My tasks — todo count, overdue, due today, due this week' })
  getMyTasks(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getMyTasks(user.tenantId, user.sub);
  }

  @Patch('tasks/:id')
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Update task (title, status, dueDate, assignee...)' })
  updateTask(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTaskDto> & { status?: TaskStatus },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updateTask(user.tenantId, id, dto);
  }

  @Post('tasks/:id/complete')
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Mark task as DONE' })
  completeTask(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.completeTask(user.tenantId, id);
  }

  @Delete('tasks/:id')
  @RequirePermissions('cases:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTask(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.deleteTask(user.tenantId, id);
  }

  // Approvals
  @Post('approvals')
  @RequirePermissions('cases:create')
  @ApiOperation({ summary: 'Request an approval (quotation discount, expense, refund...)' })
  createApproval(@Body() dto: CreateApprovalDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.createApproval(user.tenantId, dto, user.sub);
  }

  @Get('approvals/pending')
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'List approvals pending my decision' })
  getPendingApprovals(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getPendingApprovals(user.tenantId, user.sub);
  }

  @Post('approvals/:id/decide')
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Approve or reject — body: { approved: true/false, notes?: string }' })
  decide(
    @Param('id') id: string,
    @Body() dto: DecideApprovalDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.decide(user.tenantId, id, dto.approved, dto.notes, user.sub);
  }

  // Reminders
  @Post('reminders')
  @RequirePermissions('cases:create')
  @ApiOperation({ summary: 'Create reminder for self or a colleague' })
  createReminder(@Body() dto: CreateReminderDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.createReminder(user.tenantId, dto, user.sub);
  }

  @Get('reminders/upcoming')
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'Upcoming reminders (not yet due)' })
  getUpcoming(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getUpcomingReminders(user.tenantId, user.sub);
  }

  @Get('reminders/due')
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'Due reminders (overdue now)' })
  getDue(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getDueReminders(user.tenantId, user.sub);
  }

  @Post('reminders/:id/done')
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Mark reminder as done' })
  markDone(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.markReminderDone(user.tenantId, id);
  }

  // Stats
  @Get('stats')
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'My workflow stats — tasks by status, overdue, pending approvals, due reminders' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getWorkflowStats(user.tenantId, user.sub);
  }
}
