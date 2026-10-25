import { Module } from "@nestjs/common";
import { CatalogController } from "./controllers/catalog.controller";
import { AdminCatalogController } from "./controllers/admin-catalog.controller";
import { CatalogService } from "./services/catalog.service";
import { CatalogSnapshotService } from "./services/catalog-snapshot.service";
import { AuditModule } from "../platform/audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogService, CatalogSnapshotService],
  exports: [CatalogService, CatalogSnapshotService],
})
export class CatalogModule {}
