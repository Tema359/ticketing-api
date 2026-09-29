import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { readEnvironment } from './config/env.schema.js';
import { createTypeOrmOptions } from './database/typeorm.options.js';
import { Payment } from './entities/payment.entity.js';
import { PaymentStatus } from './payments/enums/payment-status.enum.js';

interface EventRevenueRow {
  event_id: string;
  event_title: string;
  currency: string;
  reservations_count: number;
  tickets_sold: number;
  revenue_minor: string;
}

const dataSource = new DataSource(createTypeOrmOptions(readEnvironment()));

async function runRevenueReport(): Promise<void> {
  await dataSource.initialize();

  try {
    const rows = await dataSource
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .innerJoin('payment.reservation', 'reservation')
      .innerJoin('reservation.ticketType', 'ticketType')
      .innerJoin('ticketType.event', 'event')
      .select('event.id', 'event_id')
      .addSelect('event.title', 'event_title')
      .addSelect('payment.currency', 'currency')
      .addSelect('COUNT(DISTINCT reservation.id)::int', 'reservations_count')
      .addSelect('SUM(reservation.quantity)::int', 'tickets_sold')
      .addSelect('SUM(payment.amount)', 'revenue_minor')
      .where('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
      .groupBy('event.id')
      .addGroupBy('event.title')
      .addGroupBy('payment.currency')
      .orderBy('SUM(payment.amount)', 'DESC')
      .getRawMany<EventRevenueRow>();

    console.table(rows);
  } finally {
    await dataSource.destroy();
  }
}

await runRevenueReport();
