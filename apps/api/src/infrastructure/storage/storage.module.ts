// apps/api/src/infrastructure/storage/storage.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalDriver } from './local.driver';
import { S3Driver } from './s3.driver';
import { StorageController } from './controllers/storage.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
