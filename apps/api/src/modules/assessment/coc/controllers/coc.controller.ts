import { Controller, Get, HttpStatus, Param, ParseUUIDPipe } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  CocService,
  CocSetResponse,
  CocSessionResponse,
} from "../services/coc.service";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";

@ApiTags("Certificate of Competency (COC)")
@ApiBearerAuth()
@Controller("assessment/coc")
export class CocController {
  constructor(private readonly cocService: CocService) {}

  @Get("sets")
  @ApiOperation({
    summary: "List published Certificate of Competency (COC) exam sets",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of published COC sets with duration and question counts",
  })
  async getCocSets(): Promise<CocSetResponse[]> {
    return this.cocService.getCocSets();
  }

  @Get("sets/:setId/session")
  @ApiOperation({
    summary: "Get full COC session question payload and per-course title mappings",
  })
  @ApiParam({ name: "setId", description: "UUID of the COC set" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "COC set session payload, questions, and course lookup dictionary",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "COC set not found" })
  async getCocSession(
    @CurrentUser("id") studentId: string,
    @Param("setId", ParseUUIDPipe) setId: string,
  ): Promise<CocSessionResponse> {
    return this.cocService.getCocSession(studentId, setId);
  }
}
