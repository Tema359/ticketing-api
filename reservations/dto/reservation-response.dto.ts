import { ApiProperty } from '@nestjs/swagger';

export class ReservationResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'Reservation identifier',
    example: '09e7b844-321b-4e54-9d67-ffb37cc0d450',
  })
  declare id: string;

  @ApiProperty({ type: String, example: 'Open Air Festival 2026 reservation' })
  declare title: string;

  @ApiProperty({ type: String, example: 'Reservation for an evening of live music.' })
  declare description: string;
}
