import { Entity, Column, CreateDateColumn, Check, Unique, PrimaryColumn } from 'typeorm';
import { TicketStatus } from '../enums/ticket-status.enum.js';

@Entity('tickets')
@Unique('tickets_admission_code_unique', ['admissionCode'])
@Check('tickets_used_at_required_when_used', "status <> 'used' OR used_at IS NOT NULL")
@Check('tickets_status_valid', "status IN ('valid', 'used', 'void')")
@Check('tickets_admission_code_not_blank', "btrim(admission_code) <> ''")
export class Ticket {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
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

  @Column({ name: 'admission_code', type: 'varchar', length: 128 })
  declare admissionCode: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: TicketStatus.VALID })
  declare status: TicketStatus;

  @CreateDateColumn({ name: 'issued_at', type: 'timestamptz' })
  declare issuedAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  declare usedAt: Date | null;
}
