import {
  Entity,
  Column,
  CreateDateColumn,
  Check,
  Unique,
  PrimaryGeneratedColumn,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { TicketStatus } from '../tickets/enums/ticket-status.enum.js';
import { Payment } from './payment.entity.js';
import { Reservation } from './reservation.entity.js';
import { User } from './user.entity.js';

@Entity('tickets')
@Index('tickets_owner_issued_at_idx', { synchronize: false })
@Unique('tickets_admission_code_unique', ['admissionCode'])
@Check('tickets_used_at_required_when_used', "status <> 'used' OR used_at IS NOT NULL")
@Check('tickets_status_valid', "status IN ('valid', 'used', 'void')")
@Check('tickets_admission_code_not_blank', "btrim(admission_code) <> ''")
export class Ticket {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'tickets_pkey',
  })
  declare id: string;

  @Column({ name: 'reservation_id', type: 'uuid' })
  declare reservationId: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  declare paymentId: string;

  @Column({ name: 'ticket_type_id', type: 'uuid' })
  declare ticketTypeId: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  declare ownerId: string;

  @ManyToOne(() => Reservation, (reservation) => reservation.tickets, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn([
    {
      name: 'reservation_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'tickets_reservation_ticket_type_fk',
    },
    { name: 'ticket_type_id', referencedColumnName: 'ticketTypeId' },
  ])
  declare reservation: Relation<Reservation>;

  @ManyToOne(() => Payment, (payment) => payment.tickets, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn([
    {
      name: 'payment_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'tickets_payment_reservation_fk',
    },
    { name: 'reservation_id', referencedColumnName: 'reservationId' },
  ])
  declare payment: Relation<Payment>;

  @ManyToOne(() => User, (user) => user.tickets, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'owner_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'tickets_owner_fk',
  })
  declare owner: Relation<User>;

  @Column({ name: 'admission_code', type: 'varchar', length: 128 })
  declare admissionCode: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: TicketStatus.VALID })
  declare status: TicketStatus;

  @CreateDateColumn({ name: 'issued_at', type: 'timestamptz' })
  declare issuedAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  declare usedAt: Date | null;
}
