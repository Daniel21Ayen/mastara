import { Module } from "@nestjs/common";
import { StudentsController } from "./controllers/students.controller";
import { AdminStudentsController } from "./controllers/admin-students.controller";
import { StudentsService } from "./services/students.service";
import { AuditModule } from "../../platform/audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [StudentsController, AdminStudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
