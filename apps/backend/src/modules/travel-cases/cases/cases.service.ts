import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLogService } from '../../../core/audit-log/audit-log.service';
import { getPaginationParams, buildPaginatedResult } from '../../../common/utils/pagination.util';
import { CreateCaseDto } from './dto/create-case.dto';
import { QueryCasesDto } from './dto/query-cases.dto';
import { AuditAction, CaseStatus, NoteType } from '@prisma/client';

const CASE_SELECT = {
  id: true, tenantId: true, number: true, title: true, status: true, description: true,
  clientId: true, leadId: true, quotationId: true,
  destination: true, departureDate: true, returnDate: true,
  numberOfPeople: true, travelType: true, currency: true,
  totalAmount: true, totalCost: true, totalPaid: true, balance: true,
  assignedToId: true, internalNotes: true, createdAt: true, updatedAt: true,
  client: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true, phone: true } },
  lead: { select: { id: true, firstName: true, lastName: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { passengers: true, services: true, checklists: true, notes: true } },
} as const;

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async generateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await this.prisma.sequenceCounter.upsert({
      where: { tenantId_type_year: { tenantId, type: 'case', year } },
      create: { tenantId, type: 'case', year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return `PRA-${year}-${String(counter.lastValue).padStart(4, '0')}`;
  }

  async create(tenantId: string, dto: CreateCaseDto, createdBy?: string) {
    const number = await this.generateNumber(tenantId);

    // If linked to a quotation, inherit financial data
    let quotationData = {};
    if (dto.quotationId) {
      const q = await this.prisma.quotation.findFirst({
        where: { id: dto.quotationId, tenantId },
        select: { totalAmount: true, totalCost: true, destination: true, departureDate: true, returnDate: true, numberOfPeople: true, travelType: true },
      });
      if (q) {
        quotationData = {
          totalAmount: q.totalAmount,
          totalCost: q.totalCost,
          destination: dto.destination ?? q.destination,
          departureDate: dto.departureDate ? new Date(dto.departureDate) : q.departureDate,
          returnDate: dto.returnDate ? new Date(dto.returnDate) : q.returnDate,
          numberOfPeople: dto.numberOfPeople ?? q.numberOfPeople,
          travelType: dto.travelType ?? q.travelType,
        };
      }
    }

    const travelCase = await this.prisma.travelCase.create({
      data: {
        tenantId, number, title: dto.title,
        status: dto.status ?? CaseStatus.INQUIRY,
        description: dto.description,
        clientId: dto.clientId,
        leadId: dto.leadId,
        quotationId: dto.quotationId,
        destination: dto.destination,
        departureDate: dto.departureDate ? new Date(dto.departureDate) : undefined,
        returnDate: dto.returnDate ? new Date(dto.returnDate) : undefined,
        numberOfPeople: dto.numberOfPeople,
        travelType: dto.travelType,
        currency: dto.currency ?? 'EUR',
        totalAmount: dto.totalAmount ?? 0,
        assignedToId: dto.assignedToId,
        internalNotes: dto.internalNotes,
        balance: dto.totalAmount ?? 0,
        ...quotationData,
        statusHistory: {
          create: { tenantId, toStatus: dto.status ?? CaseStatus.INQUIRY, changedById: createdBy },
        },
      },
      select: CASE_SELECT,
    });

    // Create default checklist items
    await this.prisma.caseChecklist.createMany({
      data: [
        { tenantId, caseId: travelCase.id, item: 'Raccogliere documenti passeggeri (passaporti)', assignedToId: createdBy },
        { tenantId, caseId: travelCase.id, item: 'Confermare disponibilità con fornitori', assignedToId: createdBy },
        { tenantId, caseId: travelCase.id, item: 'Emettere biglietti e voucher', assignedToId: createdBy },
        { tenantId, caseId: travelCase.id, item: 'Inviare documentazione al cliente', assignedToId: createdBy },
        { tenantId, caseId: travelCase.id, item: 'Verificare pagamento saldo', assignedToId: createdBy },
      ],
    });

    await this.auditLogService.log({
      tenantId, userId: createdBy, action: AuditAction.CREATE,
      resource: 'cases', resourceId: travelCase.id,
      newValues: { number: travelCase.number, title: travelCase.title },
    });

    this.logger.log(`TravelCase created: ${number}`);
    return travelCase;
  }

  async findAll(tenantId: string, query: QueryCasesDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId, deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.clientId && { clientId: query.clientId }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...(query.destination && { destination: { contains: query.destination, mode: 'insensitive' as const } }),
      ...(query.search && {
        OR: [
          { number: { contains: query.search, mode: 'insensitive' as const } },
          { title: { contains: query.search, mode: 'insensitive' as const } },
          { destination: { contains: query.search, mode: 'insensitive' as const } },
          { client: { OR: [
            { firstName: { contains: query.search, mode: 'insensitive' as const } },
            { lastName: { contains: query.search, mode: 'insensitive' as const } },
          ]}},
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.travelCase.findMany({
        where, skip, take,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        select: CASE_SELECT,
      }),
      this.prisma.travelCase.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getStats(tenantId: string) {
    const [byStatus, upcoming, financial] = await Promise.all([
      this.prisma.travelCase.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.travelCase.findMany({
        where: {
          tenantId, deletedAt: null,
          status: { in: [CaseStatus.CONFIRMED, CaseStatus.IN_PROGRESS] },
          departureDate: { gte: new Date() },
        },
        take: 5,
        orderBy: { departureDate: 'asc' },
        select: { ...CASE_SELECT },
      }),
      this.prisma.travelCase.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { totalAmount: true, totalPaid: true, balance: true },
        _count: true,
      }),
    ]);

    return { byStatus, upcoming, financial };
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.travelCase.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        ...CASE_SELECT,
        passengers: { orderBy: [{ isLeader: 'desc' }, { lastName: 'asc' }] },
        itinerary: { orderBy: { dayNumber: 'asc' } },
        services: { orderBy: { serviceDate: 'asc' } },
        checklists: { orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('Travel case not found');
    return c;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateCaseDto>, updatedBy?: string) {
    await this.findOne(tenantId, id);
    const updated = await this.prisma.travelCase.update({
      where: { id },
      data: {
        ...dto,
        departureDate: dto.departureDate ? new Date(dto.departureDate) : undefined,
        returnDate: dto.returnDate ? new Date(dto.returnDate) : undefined,
      },
      select: CASE_SELECT,
    });
    await this.auditLogService.log({
      tenantId, userId: updatedBy, action: AuditAction.UPDATE,
      resource: 'cases', resourceId: id, newValues: dto,
    });
    return updated;
  }

  async updateStatus(tenantId: string, id: string, status: CaseStatus, notes?: string, userId?: string) {
    const existing = await this.findOne(tenantId, id);

    await this.prisma.travelCase.update({ where: { id }, data: { status } });
    await this.prisma.caseStatusHistory.create({
      data: {
        tenantId, caseId: id,
        fromStatus: existing.status as CaseStatus,
        toStatus: status, notes, changedById: userId,
      },
    });

    await this.auditLogService.log({
      tenantId, userId, action: AuditAction.UPDATE,
      resource: 'cases', resourceId: id,
      oldValues: { status: existing.status }, newValues: { status },
    });

    return this.findOne(tenantId, id);
  }

  async addNote(tenantId: string, caseId: string, content: string, type = NoteType.GENERAL, isPrivate = false, authorId?: string) {
    await this.findOne(tenantId, caseId);
    return this.prisma.caseNote.create({
      data: { tenantId, caseId, content, type, isPrivate, authorId },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getNotes(tenantId: string, caseId: string) {
    await this.findOne(tenantId, caseId);
    return this.prisma.caseNote.findMany({
      where: { caseId, tenantId },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(tenantId: string, id: string, deletedBy?: string) {
    const c = await this.findOne(tenantId, id);
    if ([CaseStatus.IN_PROGRESS, CaseStatus.COMPLETED].includes(c.status as CaseStatus)) {
      throw new BadRequestException('Cannot delete an active or completed case');
    }
    await this.prisma.travelCase.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditLogService.log({
      tenantId, userId: deletedBy, action: AuditAction.DELETE, resource: 'cases', resourceId: id,
    });
  }
}
