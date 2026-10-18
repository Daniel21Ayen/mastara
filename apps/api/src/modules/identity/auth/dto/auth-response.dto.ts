import { ApiProperty } from "@nestjs/swagger";

export class UserDto {
  @ApiProperty({ example: "e305e9fa-7e5c-4d54-a3f2-10f76378e901", description: "Unique student UUID" })
  id!: string;

  @ApiProperty({ example: "Abebe Kebede", description: "Full display name of the student" })
  name!: string;

  @ApiProperty({ example: "+251911223344", description: "Primary login identifier (phone or email)" })
  identifier!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserDto, description: "Authenticated student details" })
  user!: UserDto;

  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    description: "JWT access token",
  })
  token!: string;
}

export class AdminUserDto {
  @ApiProperty({ example: "e305e9fa-7e5c-4d54-a3f2-10f76378e901", description: "Unique admin UUID" })
  id!: string;

  @ApiProperty({ example: "Mastara Admin", description: "Full display name of the administrator" })
  name!: string;

  @ApiProperty({ example: "admin@mastara.edu.et", description: "Primary login identifier (phone or email)" })
  identifier!: string;

  @ApiProperty({ example: "ADMIN", description: "Role, always ADMIN for admin portal" })
  role!: "ADMIN";
}

export class AdminAuthResponseDto {
  @ApiProperty({ type: AdminUserDto, description: "Authenticated administrator details" })
  user!: AdminUserDto;

  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    description: "JWT access token",
  })
  token!: string;
}
