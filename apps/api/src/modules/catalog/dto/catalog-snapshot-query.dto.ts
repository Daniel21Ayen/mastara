// apps/api/src/modules/catalog/dto/catalog-snapshot-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CatalogSnapshotQueryDto {
  @ApiPropertyOptional({
    description: 'Version string, ISO date string, or timestamp (ms) to fetch delta updates since',
    example: '1729857600000',
  })
  @IsOptional()
  @IsString()
  since?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination (defaults to 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size limit (defaults to 500, max 1000)',
    default: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 500;
}
