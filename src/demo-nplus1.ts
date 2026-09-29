import 'reflect-metadata';
import { AbstractLogger, DataSource } from 'typeorm';
import type { LogLevel, LogMessage } from 'typeorm';
import { readEnvironment } from './config/env.schema.js';
import { createTypeOrmOptions } from './database/typeorm.options.js';
import { Event } from './entities/event.entity.js';
import { Reservation } from './entities/reservation.entity.js';
import { TicketType } from './entities/ticket-type.entity.js';

class QueryCountLogger extends AbstractLogger {
  count = 0;

  constructor() {
    super(['query']);
  }

  reset(): void {
    this.count = 0;
  }

  protected writeLog(_level: LogLevel, messages: LogMessage | LogMessage[]): void {
    for (const message of Array.isArray(messages) ? messages : [messages]) {
      if (message.type !== 'query') {
        continue;
      }

      this.count += 1;
      console.log(`SQL #${this.count}: ${String(message.message)}`);
    }
  }
}

const logger = new QueryCountLogger();
const dataSource = new DataSource({
  ...createTypeOrmOptions(readEnvironment()),
  logger,
  logging: ['query'],
});

async function runDemo(): Promise<void> {
  await dataSource.initialize();

  try {
    const ticketTypeRepository = dataSource.getRepository(TicketType);
    const eventRepository = dataSource.getRepository(Event);
    const reservationRepository = dataSource.getRepository(Reservation);

    const results: Array<{ strategy: string; events: number; queries: number }> = [];

    for (const limit of [5, 10]) {
      console.log(`\nNaive strategy (N=${limit}): relations loaded in loops`);
      logger.reset();
      const events = await eventRepository.find({
        order: { id: 'ASC' },
        take: limit,
      });

      for (const event of events) {
        const ticketTypes = await ticketTypeRepository.findBy({ eventId: event.id });

        for (const ticketType of ticketTypes) {
          await reservationRepository.findBy({ ticketTypeId: ticketType.id });
        }
      }
      results.push({
        strategy: `naive loop (N=${events.length})`,
        events: events.length,
        queries: logger.count,
      });

      console.log(`\nFixed strategy (N=${limit}): leftJoinAndSelect`);
      logger.reset();
      const joinedEvents = await eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.ticketTypes', 'ticketType')
        .leftJoinAndSelect('ticketType.reservations', 'reservation')
        .orderBy('event.id', 'ASC')
        .take(limit)
        .getMany();
      results.push({
        strategy: `leftJoinAndSelect + take (N=${limit})`,
        events: joinedEvents.length,
        queries: logger.count,
      });

      console.log(`\nAlternative strategy (N=${limit}): relationLoadStrategy = 'query'`);
      logger.reset();
      const queriedEvents = await eventRepository.find({
        relations: {
          ticketTypes: {
            reservations: true,
          },
        },
        relationLoadStrategy: 'query',
        order: { id: 'ASC' },
        take: limit,
      });
      results.push({
        strategy: `relationLoadStrategy: 'query' (N=${limit})`,
        events: queriedEvents.length,
        queries: logger.count,
      });
    }

    console.log('\nQuery count summary');
    console.table(results);
  } finally {
    await dataSource.destroy();
  }
}

await runDemo();
