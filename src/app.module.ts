import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';

@Module({
  imports: [EventsModule, ReservationsModule],
})
export class AppModule {}
