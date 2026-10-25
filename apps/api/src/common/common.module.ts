// apps/api/src/common/common.module.ts
import { Global, Module } from "@nestjs/common";
import { ScopeService } from "./services/scope.service";

@Global()
@Module({
  providers: [ScopeService],
  exports: [ScopeService],
})
export class CommonModule {}
