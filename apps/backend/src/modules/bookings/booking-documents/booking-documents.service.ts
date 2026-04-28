import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DocumentType } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDocumentDto {
  @ApiPropertyOptional({ enum: DocumentType, default: DocumentType.VOUCHER })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiProperty({ example: 'Voucher Hotel Conrad Maldives' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'https://storage.../voucher.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileKey?: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ example: 102400, description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

@Injectable()
export class BookingDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkBooking(tenantId: string, bookingId: string) {
    const b = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId, deletedAt: null } });
    if (!b) throw new NotFoundException('Booking not found');
  }

  async create(tenantId: string, bookingId: string, dto: CreateBookingDocumentDto, uploadedById?: string) {
    await this.checkBooking(tenantId, bookingId);
    return this.prisma.bookingDocument.create({
      data: {
        tenantId, bookingId,
        type: dto.type ?? DocumentType.VOUCHER,
        name: dto.name, fileUrl: dto.fileUrl, fileKey: dto.fileKey,
        mimeType: dto.mimeType, sizeBytes: dto.sizeBytes,
        notes: dto.notes, uploadedById,
      },
    });
  }

  async findByBookingId(tenantId: string, bookingId: string) {
    await this.checkBooking(tenantId, bookingId);
    return this.prisma.bookingDocument.findMany({
      where: { bookingId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(tenantId: string, id: string) {
    const doc = await this.prisma.bookingDocument.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.bookingDocument.delete({ where: { id } });
  }
}
