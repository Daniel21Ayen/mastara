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
