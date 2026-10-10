import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "../services/auth.service";
import { RegisterDto, LoginDto, AuthResponseDto } from "../dto";
import { Public } from "../../../../common/decorators/public.decorator";

@ApiTags("Identity & Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new student with phone or email and password" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AuthResponseDto,
    description: "Student registered successfully",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Phone or email already registered",
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
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
}
