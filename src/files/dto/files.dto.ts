import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetFilesDto {
  @ApiPropertyOptional({
    example: 20,
    description: 'Number of files to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cursor returned from the previous request',
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}