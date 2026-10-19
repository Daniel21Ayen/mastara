import { Module } from "@nestjs/common";
import { ContentController } from "./controllers/content.controller";
import { AdminContentController } from "./controllers/admin-content.controller";
import { ContentService } from "./services/content.service";

@Module({
  controllers: [ContentController, AdminContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
