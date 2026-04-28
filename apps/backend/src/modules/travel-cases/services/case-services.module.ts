import { Module } from '@nestjs/common';
import { CaseServicesService } from './case-services.service';
import { CaseServicesController } from './case-services.controller';

@Module({
  controllers: [CaseServicesController],
  providers: [CaseServicesService],
  exports: [CaseServicesService],
})
export class CaseServicesModule {}
