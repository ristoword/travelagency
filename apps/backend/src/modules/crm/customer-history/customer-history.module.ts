import { Module } from '@nestjs/common';
import { CustomerHistoryService } from './customer-history.service';
import { CustomerHistoryController } from './customer-history.controller';

@Module({
  controllers: [CustomerHistoryController],
  providers: [CustomerHistoryService],
  exports: [CustomerHistoryService],
})
export class CustomerHistoryModule {}
