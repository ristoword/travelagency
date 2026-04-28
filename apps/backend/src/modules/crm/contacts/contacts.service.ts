import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { PartialType } from '@nestjs/swagger';

class UpdateContactDto extends PartialType(CreateContactDto) {}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateContactDto, createdBy?: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');

    if (dto.isPrimary) {
      await this.prisma.contact.updateMany({
        where: { clientId: dto.clientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.contact.create({
      data: { tenantId, ...dto },
    });

    this.logger.log(`Contact created: ${contact.firstName} ${contact.lastName} for client ${dto.clientId}`);
    return contact;
  }

  async findByClient(tenantId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');

    return this.prisma.contact.findMany({
      where: { clientId, tenantId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateContactDto>) {
    await this.findOne(tenantId, id);

    if (dto.isPrimary) {
      const contact = await this.prisma.contact.findUnique({ where: { id } });
      await this.prisma.contact.updateMany({
        where: { clientId: contact!.clientId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
