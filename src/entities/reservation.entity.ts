import {
  Entity,
  Column,
  CreateDateColumn,
  Check,
  Unique,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum.js';
import { Payment } from './payment.entity.js';
import { Ticket } from './ticket.entity.js';
import { TicketType } from './ticket-type.entity.js';
import { User } from './user.entity.js';

@Entity('reservations')
@Unique('reservations_id_ticket_type_unique', ['id', 'ticketTypeId'])
@Unique('reservations_user_idempotency_unique', ['userId', 'idempotencyKey'])
@Check('reservations_expiry_valid', 'expires_at > created_at')
@Check('reservations_fingerprint_sha256_format', "request_fingerprint ~ '^[0-9a-f]{64}$'")
@Check('reservations_idempotency_key_not_blank', "btrim(idempotency_key) <> ''")
@Check('reservations_status_valid', "status IN ('pending', 'confirmed', 'expired', 'cancelled')")
@Check('reservations_currency_iso_format', "currency ~ '^[A-Z]{3}$'")
@Check('reservations_unit_price_non_negative', 'unit_price >= 0')
@Check('reservations_quantity_positive', 'quantity > 0')
export class Reservation {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'reservations_pkey',
  })
  declare id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  declare userId: string;

  @ManyToOne(() => User, (user) => user.reservations, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'reservations_user_fk',
  })
  declare user: Relation<User>;

  @Column({ name: 'ticket_type_id', type: 'uuid' })
  declare ticketTypeId: string;

  @ManyToOne(() => TicketType, (ticketType) => ticketType.reservations, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'ticket_type_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'reservations_ticket_type_fk',
  })
  declare ticketType: Relation<TicketType>;

  @OneToMany(() => Payment, (payment) => payment.reservation)
  declare payments: Relation<Payment[]>;

  @OneToMany(() => Ticket, (ticket) => ticket.reservation)
  declare tickets: Relation<Ticket[]>;

  @Column({ name: 'quantity', type: 'int' })
  declare quantity: number;

  @Column({ name: 'unit_price', type: 'integer' })
  declare unitPrice: number;

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  declare currency: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: ReservationStatus.PENDING })
  declare status: ReservationStatus;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  declare idempotencyKey: string;

  @Column({ name: 'request_fingerprint', type: 'varchar', length: 64 })
  declare requestFingerprint: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  declare expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
