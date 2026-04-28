import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class ConfirmBookingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() confirmationCode?: string;
}
class CancelBookingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'bookings', version: '1' })
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Post()
  @RequirePermissions('bookings:create')
  @ApiOperation({ summary: 'Create booking (auto-number BOO-YYYY-NNNN)' })
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @RequirePermissions('bookings:read')
  @ApiOperation({ summary: 'List bookings with filters (type, status, caseId, date range)' })
  findAll(@Query() query: QueryBookingsDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findAll(user.tenantId, query);
  }

  @Get('stats')
  @RequirePermissions('bookings:read')
  @ApiOperation({ summary: 'Booking stats by type/status + unpaid to suppliers' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getStats(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('bookings:read')
  @ApiOperation({ summary: 'Get booking detail with documents and passengers' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('bookings:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateBookingDto>, @CurrentUser() user: CurrentUserPayload) {
    return this.service.update(user.tenantId, id, dto, user.sub);
  }

  @Post(':id/confirm')
  @RequirePermissions('bookings:update')
  @ApiOperation({ summary: 'Confirm booking — set status CONFIRMED + optional confirmation code' })
  confirm(@Param('id') id: string, @Body() dto: ConfirmBookingDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.confirm(user.tenantId, id, dto.confirmationCode, user.sub);
  }

  @Post(':id/cancel')
  @RequirePermissions('bookings:cancel')
  @ApiOperation({ summary: 'Cancel booking with optional reason' })
  cancel(@Param('id') id: string, @Body() dto: CancelBookingDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.cancel(user.tenantId, id, dto.reason, user.sub);
  }

  @Post(':id/mark-paid-supplier')
  @RequirePermissions('bookings:update')
  @ApiOperation({ summary: 'Mark booking as paid to supplier' })
  markPaid(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.markPaidToSupplier(user.tenantId, id, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('bookings:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(user.tenantId, id, user.sub);
  }
}
