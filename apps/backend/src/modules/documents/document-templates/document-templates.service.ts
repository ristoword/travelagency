import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TemplateType, TemplateFormat, Prisma } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ enum: TemplateType }) @IsEnum(TemplateType) type: TemplateType;
  @ApiProperty({ example: 'Fattura Standard IT' }) @IsString() @MaxLength(100) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: TemplateFormat, default: TemplateFormat.HTML }) @IsOptional() @IsEnum(TemplateFormat) format?: TemplateFormat;
  @ApiProperty({ description: 'HTML/Markdown content with {{variable}} placeholders' }) @IsString() content: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional({ description: 'Variable definitions and defaults' }) @IsOptional() @IsObject() variables?: Record<string, unknown>;
}

/**
 * Template variables available:
 * {{tenant.name}}, {{tenant.vat}}, {{tenant.address}}
 * {{client.name}}, {{client.address}}, {{client.vat}}
 * {{invoice.number}}, {{invoice.issuedAt}}, {{invoice.dueDate}}
 * {{invoice.items}} (array), {{invoice.total}}, {{invoice.vat}}
 * {{quotation.number}}, {{quotation.destination}}, {{quotation.items}}
 * {{case.number}}, {{case.title}}, {{case.itinerary}}
 */

@Injectable()
export class DocumentTemplatesService {
  private readonly logger = new Logger(DocumentTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTemplateDto) {
    const existing = await this.prisma.documentTemplate.findUnique({
      where: { tenantId_type_name: { tenantId, type: dto.type, name: dto.name } },
    });
    if (existing) throw new ConflictException(`Template "${dto.name}" already exists for this type`);

    if (dto.isDefault) {
      await this.prisma.documentTemplate.updateMany({
        where: { tenantId, type: dto.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    const tpl = await this.prisma.documentTemplate.create({
      data: { tenantId, ...dto, variables: (dto.variables ?? undefined) as Prisma.InputJsonValue | undefined },
    });

    this.logger.log(`Template created: ${tpl.name} (${tpl.type})`);
    return tpl;
  }

  async findAll(tenantId: string, type?: TemplateType) {
    return this.prisma.documentTemplate.findMany({
      where: { tenantId, isActive: true, ...(type && { type }) },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findDefault(tenantId: string, type: TemplateType) {
    const tpl = await this.prisma.documentTemplate.findFirst({
      where: { tenantId, type, isDefault: true, isActive: true },
    });
    if (!tpl) throw new NotFoundException(`No default template found for type ${type}`);
    return tpl;
  }

  async findOne(tenantId: string, id: string) {
    const tpl = await this.prisma.documentTemplate.findFirst({ where: { id, tenantId } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateTemplateDto>) {
    await this.findOne(tenantId, id);

    if (dto.isDefault) {
      const tpl = await this.prisma.documentTemplate.findUnique({ where: { id } });
      await this.prisma.documentTemplate.updateMany({
        where: { tenantId, type: tpl!.type, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentTemplate.update({
      where: { id },
      data: { ...dto, variables: (dto.variables ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  }

  /**
   * Render template with data — replaces {{variable}} placeholders.
   * For production PDF generation, integrate Puppeteer or a PDF service.
   */
  async render(tenantId: string, id: string, data: Record<string, unknown>): Promise<string> {
    const tpl = await this.findOne(tenantId, id);
    let rendered = tpl.content;

    const flatData = this.flattenObject(data);
    for (const [key, value] of Object.entries(flatData)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value ?? ''));
    }

    return rendered;
  }

  private flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(result, this.flattenObject(val as Record<string, unknown>, path));
      } else {
        result[path] = val == null ? '' : String(val);
      }
    }
    return result;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.documentTemplate.update({ where: { id }, data: { isActive: false } });
  }
}
