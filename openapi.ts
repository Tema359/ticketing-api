import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Problem } from './common/dto/problem.dto.js';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Ticketing API')
    .setDescription(
      'API for discovering events, reserving ticket inventory, processing payments, and issuing tickets.',
    )
    .setVersion('1.0.0')
    .addServer('/', 'Current origin')
    .addTag('events', 'Event discovery and catalog operations')
    .addTag('reservations', 'Ticket reservation creation and management')
    .build();

  const document = SwaggerModule.createDocument(app, config, { extraModels: [Problem] });

  const createReservationSchema = document.components?.schemas?.CreateReservationDto;
  if (createReservationSchema && !('$ref' in createReservationSchema)) {
    createReservationSchema.additionalProperties = false;
  }

  document.security = [];
  return document;
}
