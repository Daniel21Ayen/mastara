import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../../common/decorators/public.decorator";
import {
  CatalogService,
  UniversityResponse,
  ProgramResponse,
  SemesterResponse,
  CourseResponse,
} from "../services/catalog.service";
import { CatalogSnapshotService } from "../services/catalog-snapshot.service";
import { GetCoursesQueryDto } from "../dto/get-courses-query.dto";
import { CatalogSnapshotQueryDto } from "../dto/catalog-snapshot-query.dto";
import { CatalogSnapshotResponse } from "@mastara/contracts";

@ApiTags("Academic Catalog")
@Controller("catalog")
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly catalogSnapshotService: CatalogSnapshotService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get("snapshot")
  @ApiOperation({
    summary:
      "Get lightweight catalog metadata snapshot supporting delta sync and 304 ETag caching",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Catalog metadata snapshot payload",
  })
  @ApiResponse({
    status: HttpStatus.NOT_MODIFIED,
    description: "No metadata has changed since the version / ETag provided",
  })
  async getSnapshot(
    @Query() query: CatalogSnapshotQueryDto,
    @Headers("if-none-match") ifNoneMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<CatalogSnapshotResponse | void> {
    const { snapshot, etag } = await this.catalogSnapshotService.getSnapshot(query);

    if (res) {
      res.setHeader("ETag", etag);
      res.setHeader(
        "Cache-Control",
        "public, max-age=60, stale-while-revalidate=300",
      );
    }

    // Check ETag match: returns 304 with no body
    if (ifNoneMatch) {
      const cleanMatch = ifNoneMatch.replace(/^W\//, "").replace(/"/g, "").trim();
      const cleanEtag = etag.replace(/^W\//, "").replace(/"/g, "").trim();
      const cleanVersion = snapshot.version.replace(/"/g, "").trim();

      if (
        cleanMatch === cleanEtag ||
        cleanMatch === cleanVersion ||
        cleanMatch.startsWith(cleanVersion)
      ) {
        if (res) {
          res.status(HttpStatus.NOT_MODIFIED);
        }
        return;
      }
    }

    return snapshot;
  }

  @Public()
  @Get("universities")
  @ApiOperation({ summary: "List all published universities in curriculum sort order" })
  @ApiResponse({ status: 200, description: "List of published universities" })
  async getUniversities(): Promise<UniversityResponse[]> {
    return this.catalogService.getUniversities();
  }

  @Public()
  @Get("universities/:universityId/programs")
  @ApiOperation({ summary: "List academic programs for a specific university" })
  @ApiParam({ name: "universityId", description: "UUID of the university" })
  @ApiResponse({ status: 200, description: "List of academic programs" })
  @ApiResponse({ status: 404, description: "University not found" })
  async getPrograms(
    @Param("universityId", ParseUUIDPipe) universityId: string,
  ): Promise<ProgramResponse[]> {
    return this.catalogService.getPrograms(universityId);
  }

  @Public()
  @Get("programs/:programId/semesters")
  @ApiOperation({ summary: "List semesters for a specific academic program" })
  @ApiParam({ name: "programId", description: "UUID of the academic program" })
  @ApiResponse({ status: 200, description: "List of academic semesters" })
  @ApiResponse({ status: 404, description: "Program not found" })
  async getSemesters(
    @Param("programId", ParseUUIDPipe) programId: string,
  ): Promise<SemesterResponse[]> {
    return this.catalogService.getSemesters(programId);
  }

  @Public()
  @Get("courses")
  @ApiOperation({
    summary: "List published courses for a semester, optionally filtered by academic stream",
  })
  @ApiResponse({
    status: 200,
    description: "List of courses matching the semester and stream (including COMMON courses)",
  })
  @ApiResponse({ status: 404, description: "Semester not found" })
  async getCourses(
    @Query() query: GetCoursesQueryDto,
  ): Promise<CourseResponse[]> {
    return this.catalogService.getCourses(query);
  }

  @Public()
  @Get("courses/:id")
  @ApiOperation({ summary: "Get detailed information for a single course" })
  @ApiParam({ name: "id", description: "UUID of the course" })
  @ApiResponse({ status: 200, description: "Course metadata details" })
  @ApiResponse({ status: 404, description: "Course not found" })
  async getCourseById(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<CourseResponse> {
    return this.catalogService.getCourseById(id);
  }
}
