import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "../services/auth.service";
import { RegisterDto, LoginDto, AuthResponseDto, AdminAuthResponseDto } from "../dto";
import { Public } from "../../../../common/decorators/public.decorator";

@ApiTags("Identity & Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register-offline")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register an offline student upon first purchase with localAccountId idempotency" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AuthResponseDto,
    description: "Student registered successfully upon first purchase",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Phone or email already registered (PHONE_ALREADY_REGISTERED)",
  })
  async registerOffline(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Student login via phone number or email" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: AuthResponseDto,
    description: "Student logged in successfully",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid credentials",
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post("admin/login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Administrator login for admin portal" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: AdminAuthResponseDto,
    description: "Administrator logged in successfully",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid credentials or not an administrator",
  })
  async adminLogin(@Body() dto: LoginDto): Promise<AdminAuthResponseDto> {
    return this.authService.adminLogin(dto);
  }
}
