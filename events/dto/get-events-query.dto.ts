import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetEventsQueryDto {
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: 100,
    default: 20,
    description: 'Maximum number of events per page; events are ordered by id ascending',
  })
  declare limit?: string | number;

  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 512,
    description: 'Opaque pagination token returned as next_cursor by the previous response',
  })
  declare cursor?: string;
}
