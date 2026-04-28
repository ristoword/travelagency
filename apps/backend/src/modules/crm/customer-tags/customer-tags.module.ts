import { Module } from '@nestjs/common';
import { CustomerTagsService } from './customer-tags.service';
import { CustomerTagsController } from './customer-tags.controller';

@Module({
  controllers: [CustomerTagsController],
  providers: [CustomerTagsService],
  exports: [CustomerTagsService],
})
export class CustomerTagsModule {}
