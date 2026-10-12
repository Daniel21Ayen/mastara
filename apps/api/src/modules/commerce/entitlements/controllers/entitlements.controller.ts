import { Controller, Get, HttpStatus } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { EntitlementsService, EntitlementResponse } from "../services/entitlements.service";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Commerce: Entitlements")
@ApiBearerAuth()
@Controller("commerce/entitlements")
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get()
  @ApiOperation({
    summary: "List active course entitlements for the authenticated student",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Active entitlements with course info and days remaining",
  })
  async getStudentEntitlements(
    @CurrentUser("id") studentId: string,
  ): Promise<EntitlementResponse[]> {
    return this.entitlementsService.getStudentEntitlements(studentId);
  }
}
