import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { STORAGE_DRIVER } from "./storage.interface";
import { LocalDriver } from "./local.driver";
import { S3Driver } from "./s3.driver";
import { StorageService } from "./storage.service";

import { StorageController } from "./controllers/storage.controller";

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    LocalDriver,
    S3Driver,
    {
      provide: STORAGE_DRIVER,
      useFactory: (config: ConfigService, local: LocalDriver, s3: S3Driver) => {
        const driverName = config.get<string>("STORAGE_DRIVER")?.toLowerCase();
        if (driverName === "s3") {
          return s3;
        }
        return local;
      },
      inject: [ConfigService, LocalDriver, S3Driver],
    },
    StorageService,
  ],
  exports: [StorageService, STORAGE_DRIVER],
})
export class StorageModule {}
