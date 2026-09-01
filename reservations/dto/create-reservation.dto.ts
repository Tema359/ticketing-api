import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({
    type: String,
    description: 'Reservation title',
    example: 'Open Air Festival 2026 reservation',
  })
  declare title: string;

  @ApiProperty({
    type: String,
    description: 'Reservation description',
    example: 'Reservation for an evening of live music.',
  })
  declare description: string;
}
