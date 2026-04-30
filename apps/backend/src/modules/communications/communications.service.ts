import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from './email/email.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import {
  getPaginationParams,
  buildPaginatedResult,
} from '../../common/utils/pagination.util';
import {
  CommunicationChannel,
  CommunicationStatus,
  CommTemplateType,
  Prisma,
} from '@prisma/client';
import {
  IsString, IsEnum, IsOptional, IsArray, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendCommunicationDto {
  @ApiProperty({ enum: CommunicationChannel }) @IsEnum(CommunicationChannel) channel: CommunicationChannel;
  @ApiProperty({ example: '+39333123456 or email@example.com' }) @IsString() toAddress: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bodyHtml?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() caseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() bookingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() invoiceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() templateId?: string;
}

export class QueryCommunicationsDto {
  @ApiPropertyOptional({ type: Number }) @IsOptional() page?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() limit?: number;
  @ApiPropertyOptional({ enum: CommunicationChannel }) @IsOptional() @IsEnum(CommunicationChannel) channel?: CommunicationChannel;
  @ApiPropertyOptional({ enum: CommunicationStatus }) @IsOptional() @IsEnum(CommunicationStatus) status?: CommunicationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

const COMM_SELECT = {
  id: true, tenantId: true, channel: true, direction: true, status: true,
  toAddress: true, toName: true, fromAddress: true,
  clientId: true, leadId: true, caseId: true, bookingId: true, invoiceId: true,
  subject: true, body: true, bodyHtml: true, templateId: true,
  externalId: true, errorMsg: true,
  sentAt: true, deliveredAt: true, readAt: true, failedAt: true,
  authorId: true, createdAt: true,
  client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
  author: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async send(tenantId: string, dto: SendCommunicationDto, authorId?: string) {
    // Create communication record
    const comm = await this.prisma.communication.create({
      data: {
        tenantId,
        channel: dto.channel,
        direction: 'OUTBOUND',
        status: CommunicationStatus.QUEUED,
        toAddress: dto.toAddress,
        toName: dto.toName,
        subject: dto.subject,
        body: dto.body,
        bodyHtml: dto.bodyHtml,
        clientId: dto.clientId,
        leadId: dto.leadId,
        caseId: dto.caseId,
        bookingId: dto.bookingId,
        invoiceId: dto.invoiceId,
        templateId: dto.templateId,
        authorId,
      },
      select: COMM_SELECT,
    });

    // Dispatch based on channel
    let result: { success: boolean; messageId?: string; error?: string };

    if (dto.channel === CommunicationChannel.EMAIL) {
      result = await this.emailService.send({
        to: dto.toAddress,
        toName: dto.toName,
        subject: dto.subject ?? '(nessun oggetto)',
        body: dto.body,
        bodyHtml: dto.bodyHtml,
      });
    } else if (dto.channel === CommunicationChannel.WHATSAPP) {
      result = await this.whatsAppService.sendText({
        to: dto.toAddress,
        message: dto.body,
      });
    } else {
      result = { success: false, error: `Channel ${dto.channel} requires external integration` };
    }

    // Update record with result
    await this.prisma.communication.update({
      where: { id: comm.id },
      data: {
        status: result.success ? CommunicationStatus.SENT : CommunicationStatus.FAILED,
        externalId: result.messageId,
        errorMsg: result.error,
        sentAt: result.success ? new Date() : undefined,
        failedAt: result.success ? undefined : new Date(),
      },
    });

    return { ...comm, status: result.success ? 'SENT' : 'FAILED', externalId: result.messageId, errorMsg: result.error };
  }

  async findAll(tenantId: string, query: QueryCommunicationsDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where = {
      tenantId,
      ...(query.channel && { channel: query.channel }),
      ...(query.status && { status: query.status }),
      ...(query.clientId && { clientId: query.clientId }),
      ...(query.caseId && { caseId: query.caseId }),
      ...(query.search && {
        OR: [
          { toAddress: { contains: query.search, mode: 'insensitive' as const } },
          { toName: { contains: query.search, mode: 'insensitive' as const } },
          { subject: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.communication.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        select: COMM_SELECT,
      }),
      this.prisma.communication.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getStats(tenantId: string) {
    const [byChannel, byStatus, recent] = await Promise.all([
      this.prisma.communication.groupBy({
        by: ['channel'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.communication.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.communication.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: COMM_SELECT,
      }),
    ]);
    return { byChannel, byStatus, recent };
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.communication.findFirst({
      where: { id, tenantId },
      select: COMM_SELECT,
    });
    if (!c) throw new NotFoundException('Communication not found');
    return c;
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  async createTemplate(tenantId: string, dto: {
    type: CommTemplateType; channel: CommunicationChannel;
    name: string; description?: string; subject?: string;
    body: string; bodyHtml?: string; isDefault?: boolean;
    variables?: Record<string, unknown>;
  }) {
    if (dto.isDefault) {
      await this.prisma.communicationTemplate.updateMany({
        where: { tenantId, type: dto.type, channel: dto.channel, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.communicationTemplate.create({
      data: { tenantId, ...dto, variables: (dto.variables ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  }

  async getTemplates(tenantId: string, type?: CommTemplateType, channel?: CommunicationChannel) {
    return this.prisma.communicationTemplate.findMany({
      where: { tenantId, isActive: true, ...(type && { type }), ...(channel && { channel }) },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async sendWithTemplate(tenantId: string, templateId: string, to: string, data: Record<string, unknown>, authorId?: string) {
    const tpl = await this.prisma.communicationTemplate.findFirst({ where: { id: templateId, tenantId } });
    if (!tpl) throw new NotFoundException('Template not found');

    const subject = tpl.subject ? this.emailService.renderTemplate(tpl.subject, data) : undefined;
    const body = this.emailService.renderTemplate(tpl.body, data);
    const bodyHtml = tpl.bodyHtml ? this.emailService.renderTemplate(tpl.bodyHtml, data) : undefined;

    return this.send(tenantId, {
      channel: tpl.channel,
      toAddress: to,
      subject, body, bodyHtml,
      templateId,
    }, authorId);
  }
}
