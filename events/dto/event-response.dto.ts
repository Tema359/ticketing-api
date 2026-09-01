import { ApiProperty } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty({ format: 'uuid' })
  declare id: string;

  @ApiProperty()
  declare title: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'An evening of live music.',
  })
  declare description: string | null;
}
