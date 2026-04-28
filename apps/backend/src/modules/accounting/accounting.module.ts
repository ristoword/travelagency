import { Module } from '@nestjs/common';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { CreditNotesModule } from './credit-notes/credit-notes.module';

@Module({
  imports: [InvoicesModule, PaymentsModule, CreditNotesModule],
  exports: [InvoicesModule, PaymentsModule, CreditNotesModule],
})
export class AccountingModule {}
