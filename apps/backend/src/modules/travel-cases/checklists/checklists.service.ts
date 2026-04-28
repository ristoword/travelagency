import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IsString, IsOptional, IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChecklistItemDto {
  @ApiProperty({ example: 'Raccogliere copia passaporti passeggeri' }) @IsString() item: string;
  @ApiPropertyOptional({ example: '2025-05-30' }) @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkCase(tenantId: string, caseId: string) {
    const c = await this.prisma.travelCase.findFirst({ where: { id: caseId, tenantId, deletedAt: null } });
    if (!c) throw new NotFoundException('Travel case not found');
  }

  async create(tenantId: string, caseId: string, dto: CreateChecklistItemDto) {
    await this.checkCase(tenantId, caseId);
    return this.prisma.caseChecklist.create({
      data: {
        tenantId, caseId, item: dto.item,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId: dto.assignedToId,
        notes: dto.notes,
      },
    });
  }

  async findByCaseId(tenantId: string, caseId: string) {
    await this.checkCase(tenantId, caseId);
    return this.prisma.caseChecklist.findMany({
      where: { caseId, tenantId },
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async toggle(tenantId: string, id: string, userId?: string) {
    const item = await this.prisma.caseChecklist.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Checklist item not found');

    const completing = !item.isCompleted;
    return this.prisma.caseChecklist.update({
      where: { id },
      data: {
        isCompleted: completing,
        completedAt: completing ? new Date() : null,
        completedById: completing ? userId : null,
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<CreateChecklistItemDto>) {
    const item = await this.prisma.caseChecklist.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Checklist item not found');
    return this.prisma.caseChecklist.update({
      where: { id },
      data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined },
    });
  }

  async remove(tenantId: string, id: string) {
    const item = await this.prisma.caseChecklist.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Checklist item not found');
    await this.prisma.caseChecklist.delete({ where: { id } });
  }

  async getProgress(tenantId: string, caseId: string) {
    const [total, completed] = await Promise.all([
      this.prisma.caseChecklist.count({ where: { caseId, tenantId } }),
      this.prisma.caseChecklist.count({ where: { caseId, tenantId, isCompleted: true } }),
    ]);
    return { total, completed, pending: total - completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }
}
