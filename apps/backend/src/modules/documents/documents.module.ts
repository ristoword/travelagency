import { Module } from '@nestjs/common';
import { ClientDocumentsModule } from './client-documents/client-documents.module';
import { DocumentTemplatesModule } from './document-templates/document-templates.module';

@Module({
  imports: [ClientDocumentsModule, DocumentTemplatesModule],
  exports: [ClientDocumentsModule, DocumentTemplatesModule],
})
export class DocumentsModule {}
