import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  declare status: 'ok';

  @ApiProperty({ type: Number, minimum: 0 })
  declare uptime_seconds: number;
}
