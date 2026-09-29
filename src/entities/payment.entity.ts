import {
  Entity,
  Column,
  CreateDateColumn,
  Check,
  Unique,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { PaymentStatus } from '../payments/enums/payment-status.enum.js';
import { Reservation } from './reservation.entity.js';
import { Ticket } from './ticket.entity.js';

@Entity('payments')
@Index('payments_failed_created_at_idx', { synchronize: false })
@Index('payments_one_success_per_reservation_idx', ['reservationId'], {
  unique: true,
  where: "status = 'succeeded'",
})
@Unique('payments_id_reservation_unique', ['id', 'reservationId'])
@Unique('payments_provider_reference_unique', ['provider', 'providerPaymentId'])
@Check('payments_paid_at_required_for_success', "status <> 'succeeded' OR paid_at IS NOT NULL")
@Check('payments_status_valid', "status IN ('pending', 'succeeded', 'failed', 'refunded')")
@Check('payments_currency_iso_format', "currency ~ '^[A-Z]{3}$'")
@Check('payments_amount_non_negative', 'amount >= 0')
@Check('payments_provider_not_blank', "btrim(provider) <> ''")
export class Payment {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'payments_pkey',
  })
  declare id: string;

  @Column({ name: 'reservation_id', type: 'uuid' })
  declare reservationId: string;

  @ManyToOne(() => Reservation, (reservation) => reservation.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'reservation_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'payments_reservation_fk',
  })
  declare reservation: Relation<Reservation>;

  @OneToMany(() => Ticket, (ticket) => ticket.payment)
  declare tickets: Relation<Ticket[]>;

  @Column({ name: 'provider', type: 'varchar', length: 50 })
  declare provider: string;

  @Column({ name: 'provider_payment_id', type: 'varchar', length: 255, nullable: true })
  declare providerPaymentId: string | null;

  @Column({ type: 'integer' })
  declare amount: number;

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  declare currency: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: PaymentStatus.PENDING })
  declare status: PaymentStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  declare paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
