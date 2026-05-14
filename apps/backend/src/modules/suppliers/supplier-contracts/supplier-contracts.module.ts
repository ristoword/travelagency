import { Module } from '@nestjs/common';
import { SupplierContractsService } from './supplier-contracts.service';
import { SupplierContractsController } from './supplier-contracts.controller';

@Module({
  controllers: [SupplierContractsController],
  providers: [SupplierContractsService],
  exports: [SupplierContractsService],
})
export class SupplierContractsModule {}
