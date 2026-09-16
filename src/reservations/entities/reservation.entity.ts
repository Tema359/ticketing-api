import {
  Entity,
  Column,
  CreateDateColumn,
  Check,
  Unique,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReservationStatus } from '../enums/reservation-status.enum.js';

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
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'reservations_pkey',
  })
  declare id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  declare userId: string;

  @Column({ name: 'ticket_type_id', type: 'uuid' })
  declare ticketTypeId: string;

  @Column({ name: 'quantity', type: 'int' })
  declare quantity: number;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  declare unitPrice: string;

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
