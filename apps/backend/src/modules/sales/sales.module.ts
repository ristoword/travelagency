import { Module } from '@nestjs/common';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { QuotationsModule } from './quotations/quotations.module';
import { ProposalsModule } from './proposals/proposals.module';
import { PricingModule } from './pricing/pricing.module';

@Module({
  imports: [
    OpportunitiesModule,
    QuotationsModule,
    ProposalsModule,
    PricingModule,
  ],
  exports: [
    OpportunitiesModule,
    QuotationsModule,
    ProposalsModule,
    PricingModule,
  ],
})
export class SalesModule {}
