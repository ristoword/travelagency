import { Module } from '@nestjs/common';
import { BookingDocumentsService } from './booking-documents.service';
import { BookingDocumentsController } from './booking-documents.controller';

@Module({
  controllers: [BookingDocumentsController],
  providers: [BookingDocumentsService],
  exports: [BookingDocumentsService],
})
export class BookingDocumentsModule {}
