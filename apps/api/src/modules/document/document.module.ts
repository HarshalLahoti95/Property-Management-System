import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentRepository } from './document.repository';
import { LocalStorageProvider } from './providers/local-storage.provider';

@Module({
  controllers: [DocumentController],
  providers: [
    DocumentService,
    DocumentRepository,
    {
      provide: 'StorageProvider',
      useClass: LocalStorageProvider,
    },
  ],
  exports: [DocumentService, DocumentRepository, 'StorageProvider'],
})
export class DocumentModule {}
