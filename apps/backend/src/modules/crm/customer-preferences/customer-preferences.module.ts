import { Module } from '@nestjs/common';
import { CustomerPreferencesService } from './customer-preferences.service';
import { CustomerPreferencesController } from './customer-preferences.controller';

@Module({
  controllers: [CustomerPreferencesController],
  providers: [CustomerPreferencesService],
  exports: [CustomerPreferencesService],
})
export class CustomerPreferencesModule {}
