import 'reflect-metadata';
import type { EntityManager, EntityTarget, ObjectLiteral } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import dataSource from './data-source.js';
import { Event } from './entities/event.entity.js';
import { Payment } from './entities/payment.entity.js';
import { Reservation } from './entities/reservation.entity.js';
import { Ticket } from './entities/ticket.entity.js';
import { TicketType } from './entities/ticket-type.entity.js';
import { User } from './entities/user.entity.js';
import { EventStatus } from './events/enums/event-status.enum.js';
import { PaymentStatus } from './payments/enums/payment-status.enum.js';
import { ReservationStatus } from './reservations/enums/reservation-status.enum.js';
import { TicketStatus } from './tickets/enums/ticket-status.enum.js';
import { UserRole } from './users/enums/user-role.enum.js';

const ROW_COUNT = 10;
const CREATED_AT = new Date('2026-01-01T10:00:00.000Z');

function seedId(namespace: number, position: number): string {
  return `00000000-0000-4000-8000-${String(namespace * 100 + position).padStart(12, '0')}`;
}

async function insertIgnoringConflicts<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: EntityTarget<T>,
  rows: Array<QueryDeepPartialEntity<T>>,
): Promise<void> {
  await manager.createQueryBuilder().insert().into(entity).values(rows).orIgnore().execute();
}

async function seed(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      await insertIgnoringConflicts(manager, User, [
        {
          id: seedId(1, 1),
          email: 'organizer-1@example.test',
          role: UserRole.ORGANIZER,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
        {
          id: seedId(1, 2),
          email: 'organizer-2@example.test',
          role: UserRole.ORGANIZER,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
        {
          id: seedId(1, 3),
          email: 'admin@example.test',
          role: UserRole.ADMIN,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
        ...Array.from({ length: 7 }, (_, index) => ({
          id: seedId(1, index + 4),
          email: `attendee-${index + 1}@example.test`,
          role: UserRole.ATTENDEE,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        })),
      ]);

      await insertIgnoringConflicts(
        manager,
        Event,
        Array.from({ length: ROW_COUNT }, (_, index) => {
          const position = index + 1;
          const startsAt = new Date(`2027-${String(position).padStart(2, '0')}-10T18:00:00.000Z`);

          return {
            id: seedId(2, position),
            organizerId: seedId(1, (index % 2) + 1),
            title: `Seed Event ${position}`,
            description: `Deterministic event ${position} for local development`,
            venueName: `Seed Venue ${position}`,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
            status: EventStatus.PUBLISHED,
            createdAt: CREATED_AT,
            updatedAt: CREATED_AT,
          };
        }),
      );

      await insertIgnoringConflicts(
        manager,
        TicketType,
        Array.from({ length: ROW_COUNT }, (_, index) => {
          const position = index + 1;

          return {
            id: seedId(3, position),
            eventId: seedId(2, position),
            name: 'General Admission',
            price: `${100 + position}.00`,
            currency: 'PLN',
            inventoryTotal: 100,
            inventoryAvailable: 99,
            salesStartAt: new Date('2026-06-01T00:00:00.000Z'),
            salesEndAt: new Date('2026-12-31T23:59:59.000Z'),
            createdAt: CREATED_AT,
            updatedAt: CREATED_AT,
          };
        }),
      );

      await insertIgnoringConflicts(
        manager,
        Reservation,
        Array.from({ length: ROW_COUNT }, (_, index) => {
          const position = index + 1;

          return {
            id: seedId(4, position),
            userId: seedId(1, (index % 7) + 4),
            ticketTypeId: seedId(3, position),
            quantity: 1,
            unitPrice: `${100 + position}.00`,
            currency: 'PLN',
            status: ReservationStatus.CONFIRMED,
            idempotencyKey: `seed-reservation-${position}`,
            requestFingerprint: position.toString(16).padStart(64, '0'),
            expiresAt: new Date('2026-01-01T10:15:00.000Z'),
            createdAt: CREATED_AT,
            updatedAt: CREATED_AT,
          };
        }),
      );

      await insertIgnoringConflicts(
        manager,
        Payment,
        Array.from({ length: ROW_COUNT }, (_, index) => {
          const position = index + 1;

          return {
            id: seedId(5, position),
            reservationId: seedId(4, position),
            provider: 'seed-provider',
            providerPaymentId: `seed-payment-${position}`,
            amount: `${100 + position}.00`,
            currency: 'PLN',
            status: PaymentStatus.SUCCEEDED,
            paidAt: new Date('2026-01-01T10:05:00.000Z'),
            createdAt: CREATED_AT,
            updatedAt: CREATED_AT,
          };
        }),
      );

      await insertIgnoringConflicts(
        manager,
        Ticket,
        Array.from({ length: ROW_COUNT }, (_, index) => {
          const position = index + 1;

          return {
            id: seedId(6, position),
            reservationId: seedId(4, position),
            paymentId: seedId(5, position),
            ticketTypeId: seedId(3, position),
            ownerId: seedId(1, (index % 7) + 4),
            admissionCode: `SEED-TICKET-${String(position).padStart(4, '0')}`,
            status: TicketStatus.VALID,
            issuedAt: new Date('2026-01-01T10:06:00.000Z'),
            usedAt: null,
          };
        }),
      );
    });

    console.log(`Seed complete: ${ROW_COUNT} deterministic rows per main table.`);
  } finally {
    await dataSource.destroy();
  }
}

await seed();
