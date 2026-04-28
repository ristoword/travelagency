import {
  Controller, Get, Post, Body, Param, Delete,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingDocumentsService, CreateBookingDocumentDto } from './booking-documents.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('Bookings — Documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'bookings/:bookingId/documents', version: '1' })
export class BookingDocumentsController {
  constructor(private readonly service: BookingDocumentsService) {}

  @Post()
  @RequirePermissions('documents:create')
  @ApiOperation({ summary: 'Attach document (voucher, ticket, confirmation) to booking' })
  create(
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateBookingDocumentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(user.tenantId, bookingId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('documents:read')
  @ApiOperation({ summary: 'List documents for a booking' })
  findAll(@Param('bookingId') bookingId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findByBookingId(user.tenantId, bookingId);
  }

  @Delete(':id')
  @RequirePermissions('documents:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete document' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id);
  }
}
