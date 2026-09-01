import { Body, Controller, Delete, Get, HttpCode, Post, Headers, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReservationsService } from './reservations.service.js';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiUnsupportedMediaTypeResponse,
  ApiUnprocessableEntityResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Problem } from '../common/dto/problem.dto.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ReservationResponseDto } from './dto/reservation-response.dto.js';

@ApiTags('reservations')
@ApiBadRequestResponse({
  description: 'Invalid request parameters',
  content: {
    'application/problem+json': { schema: { $ref: getSchemaPath(Problem) } },
  },
})
@ApiInternalServerErrorResponse({
  description: 'Unexpected server error or response that violates the OpenAPI contract',
  content: {
    'application/problem+json': { schema: { $ref: getSchemaPath(Problem) } },
  },
})
@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post()
  @ApiUnsupportedMediaTypeResponse({
    description: 'Request body must use application/json',
    content: {
      'application/problem+json': { schema: { $ref: getSchemaPath(Problem) } },
    },
  })
  @ApiOperation({ summary: 'Create reservation' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Repeating a request with the same key and the same body returns the original response without creating another reservation.',
    schema: { type: 'string' },
  })
  @ApiBadRequestResponse({
    description: 'Missing Idempotency-Key header or invalid request body',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(Problem) },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'The Idempotency-Key has already been used with a different request body',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(Problem) },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Reservation created successfully',
    type: ReservationResponseDto,
    headers: {
      Location: {
        description: 'Relative URL of the created reservation',
        schema: { type: 'string', format: 'uri-reference' },
      },
      'Idempotency-Replay': {
        description: 'True when the original response is replayed for the same key and body',
        schema: { type: 'string', enum: ['true'] },
      },
    },
  })
  @HttpCode(201)
  create(
    @Headers('Idempotency-Key') key: string,
    @Body() dto: CreateReservationDto,
    @Res({ passthrough: true }) response: Response,
  ): ReservationResponseDto {
    const result = this.reservationsService.create(dto, key);

    response.setHeader('Location', `/reservations/${result.reservation.id}`);

    if (result.replayed) {
      response.setHeader('Idempotency-Replay', 'true');
    }

    return result.reservation;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation by ID' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Reservation identifier',
  })
  @ApiOkResponse({
    description: 'Reservation found',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Reservation not found',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(Problem) },
      },
    },
  })
  findOne(@Param('id') id: string): ReservationResponseDto {
    return this.reservationsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cancel reservation',
    description: 'Removes the reservation from in-memory storage.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Reservation identifier',
  })
  @ApiNoContentResponse({
    description: 'Reservation cancelled; no response body',
  })
  @ApiNotFoundResponse({
    description: 'Reservation not found',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(Problem) },
      },
    },
  })
  remove(@Param('id') id: string): void {
    this.reservationsService.remove(id);
  }
}
