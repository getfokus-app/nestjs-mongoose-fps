import { Transform, TransformFnParams, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export type SortableParameters = Record<string, 'desc' | 'asc'>;
export type FilterableParameters = Record<string, unknown>;

/** The largest page a client may ask for; the biggest caller in the apps asks for 1000. */
export const MAX_LIMIT = 1000;

export class CounterDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Filter query string, see documentation for its schema',
  })
  @Transform((v: TransformFnParams) => filterQueryToObject(v.value))
  @IsObject()
  readonly filter?: FilterableParameters;
}

export class CollectionDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Filter query string, see documentation for its schema',
  })
  @Transform((v: TransformFnParams) => filterQueryToObject(v.value))
  @IsOptional()
  @IsObject()
  readonly filter?: FilterableParameters;

  @ApiPropertyOptional({
    example: '-created_at;filename',
    description:
      'Use only allowed properties separated by semicolon; default is ascending created_at; prefix name with hyphen/minus sign to get descending order',
    type: String,
  })
  @IsOptional()
  @IsString()
  readonly sort?: string;

  readonly sorter?: SortableParameters;

  @Type(() => Number)
  @Min(1)
  @ApiPropertyOptional({ example: 1, description: '' })
  readonly page?: number = 1;

  @Type(() => Number)
  @Min(1)
  @Max(MAX_LIMIT)
  @ApiPropertyOptional({
    example: 10,
    description: `Page size, 1 to ${MAX_LIMIT}`,
    minimum: 1,
    maximum: MAX_LIMIT,
  })
  readonly limit?: number = 10;
}

function filterQueryToObject(v: string): Record<string, unknown> {
  return JSON.parse(v);
}
