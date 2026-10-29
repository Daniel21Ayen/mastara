import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  PricingService,
  AccountsResponse,
  BuyableCourseResponse,
  CourseBriefResponse,
  QuoteOrderResponse,
} from "../services/pricing.service";
import {
  QuoteOrderDto,
  GetBuyableCoursesQueryDto,
  GetFullPackageQueryDto,
} from "../dto";
import { CurrentUser } from "../../../../common/decorators/current-user.decorator";
import { Public } from "../../../../common/decorators/public.decorator";
import { PricingConfig } from "@mastara/domain";

@ApiTags("Commerce & Pricing")
@ApiBearerAuth()
@Controller("commerce")
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Public()
  @Get("pricing")
  @ApiOperation({
    summary: "Get live pricing rules, bundle thresholds, and access durations",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Current platform pricing configuration",
  })
  async getPricingConfig(): Promise<PricingConfig> {
    return this.pricingService.getPricingConfig();
  }

  @Public()
  @Get("accounts")
  @ApiOperation({
    summary: "Get deposit account numbers for supported Ethiopian payment methods",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Account details for CBE Mobile, CBE Birr, and Telebirr",
  })
  async getAccounts(): Promise<AccountsResponse> {
    return this.pricingService.getAccounts();
  }

  @Public()
  @Post("pricing/quote")
  @ApiOperation({
    summary: "Calculate dynamic server-authoritative price quote for any product/bundle",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Quoted line items, total price in ETB, and access duration in days",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid course count for bundle (requires between min and max courses)",
  })
  async quote(@Body() dto: QuoteOrderDto): Promise<QuoteOrderResponse> {
    return this.pricingService.quote(dto);
  }

  @Get("courses/buyable")
  @ApiOperation({
    summary: "Get courses for a semester with ownership status and renewal eligibility",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of courses annotated with PAID/LOCKED access and buyable flag",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Semester not found",
  })
  async getBuyableCourses(
    @CurrentUser("id") studentId: string,
    @Query() query: GetBuyableCoursesQueryDto,
  ): Promise<BuyableCourseResponse[]> {
    return this.pricingService.getBuyableCourses(studentId, query);
  }

  @Get("courses/full-package")
  @ApiOperation({
    summary: "Get all freshman courses unlocked by a full stream package",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of freshman courses included in the package",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Program not found",
  })
  async getFullPackageCourses(
    @Query() query: GetFullPackageQueryDto,
  ): Promise<CourseBriefResponse[]> {
    return this.pricingService.getFullPackageCourses(query);
  }
}
