import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service.js';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Problem } from '../common/dto/problem.dto.js';
import { EventsPageResponseDto } from './dto/events-page-response.dto.js';
import { GetEventsQueryDto } from './dto/get-events-query.dto.js';
import { EventResponseDto } from './dto/event-response.dto.js';

@ApiTags('events')
@ApiBadRequestResponse({
  description: 'Invalid request parameters',
  content: { 'application/problem+json': { schema: { $ref: getSchemaPath(Problem) } } },
})
@ApiInternalServerErrorResponse({
  description: 'Unexpected server error or response that violates the OpenAPI contract',
  content: { 'application/problem+json': { schema: { $ref: getSchemaPath(Problem) } } },
})
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List events' })
  @ApiOkResponse({ description: 'Page of events', type: EventsPageResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid limit or pagination cursor',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(Problem) },
      },
    },
  })
  findAll(@Query() query: GetEventsQueryDto): EventsPageResponseDto {
    return this.eventsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Event identifier',
  })
  @ApiOkResponse({
    description: 'Event found',
    type: EventResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Event not found',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(Problem) },
      },
    },
  })
  findOne(@Param('id') id: string): EventResponseDto {
    return this.eventsService.findOne(id);
  }
}
