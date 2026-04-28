import { Module } from '@nestjs/common';
import { ClientDocumentsService } from './client-documents.service';
import { ClientDocumentsController } from './client-documents.controller';

@Module({
  controllers: [ClientDocumentsController],
  providers: [ClientDocumentsService],
  exports: [ClientDocumentsService],
})
export class ClientDocumentsModule {}
