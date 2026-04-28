import { Module } from '@nestjs/common';
import { CasesModule } from './cases/cases.module';
import { PassengersModule } from './passengers/passengers.module';
import { ItinerariesModule } from './itineraries/itineraries.module';
import { CaseServicesModule } from './services/case-services.module';
import { ChecklistsModule } from './checklists/checklists.module';

@Module({
  imports: [
    CasesModule,
    PassengersModule,
    ItinerariesModule,
    CaseServicesModule,
    ChecklistsModule,
  ],
  exports: [
    CasesModule,
    PassengersModule,
    ItinerariesModule,
    CaseServicesModule,
    ChecklistsModule,
  ],
})
export class TravelCasesModule {}
