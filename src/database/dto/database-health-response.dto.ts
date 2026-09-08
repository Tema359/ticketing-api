import { ApiProperty } from '@nestjs/swagger';

export class DatabaseHealthResponseDto {
  @ApiProperty({ example: 'ok' })
  declare status: 'ok';

  @ApiProperty({ type: String, format: 'date-time' })
  declare database_time: string;

  @ApiProperty({ type: Number, minimum: 0 })
  declare uptime_seconds: number;
}
