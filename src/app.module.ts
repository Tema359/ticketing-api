import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { EventsModule } from './events/events.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { validate } from './config/env.schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DatabaseModule,
    EventsModule,
    ReservationsModule,
  ],
})
export class AppModule {}
