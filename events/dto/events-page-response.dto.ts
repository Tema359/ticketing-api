import { ApiProperty } from "@nestjs/swagger";
import { EventResponseDto } from "./event-response.dto.js";

export class EventsPageResponseDto {
  @ApiProperty({
    type: EventResponseDto,
    isArray: true,
  })
  declare items: EventResponseDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Null when there are no more pages',
  })
  declare next_cursor: string | null;
}
