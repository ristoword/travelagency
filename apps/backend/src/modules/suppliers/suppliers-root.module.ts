import { Module } from '@nestjs/common';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SupplierContractsModule } from './supplier-contracts/supplier-contracts.module';

@Module({
  imports: [SuppliersModule, SupplierContractsModule],
  exports: [SuppliersModule, SupplierContractsModule],
})
export class SuppliersRootModule {}
