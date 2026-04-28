import { Module } from '@nestjs/common';
import { BookingsModule } from './bookings/bookings.module';
import { BookingDocumentsModule } from './booking-documents/booking-documents.module';

@Module({
  imports: [BookingsModule, BookingDocumentsModule],
  exports: [BookingsModule, BookingDocumentsModule],
})
export class BookingsRootModule {}
