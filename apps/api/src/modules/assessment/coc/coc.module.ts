import { Module } from "@nestjs/common";
import { CocController } from "./controllers/coc.controller";
import { CocService } from "./services/coc.service";

@Module({
  controllers: [CocController],
  providers: [CocService],
  exports: [CocService],
})
export class CocModule {}
