import { Module } from '@nestjs/common';
import { ClientsModule } from './clients/clients.module';
import { LeadsModule } from './leads/leads.module';
import { ContactsModule } from './contacts/contacts.module';
import { CustomerTagsModule } from './customer-tags/customer-tags.module';
import { CustomerPreferencesModule } from './customer-preferences/customer-preferences.module';
import { CustomerHistoryModule } from './customer-history/customer-history.module';

@Module({
  imports: [
    ClientsModule,
    LeadsModule,
    ContactsModule,
    CustomerTagsModule,
    CustomerPreferencesModule,
    CustomerHistoryModule,
  ],
  exports: [
    ClientsModule,
    LeadsModule,
    ContactsModule,
    CustomerTagsModule,
    CustomerPreferencesModule,
    CustomerHistoryModule,
  ],
})
export class CrmModule {}
