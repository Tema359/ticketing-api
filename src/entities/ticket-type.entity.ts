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
import { Reservation } from './reservation.entity.js';
import { Event } from './event.entity.js';

@Entity('ticket_types')
@Unique('ticket_types_event_name_unique', ['eventId', 'name'])
@Check(
  'ticket_types_sales_range_valid',
  'sales_start_at IS NULL OR sales_end_at IS NULL OR sales_end_at > sales_start_at',
)
@Check(
  'ticket_types_inventory_available_valid',
  'inventory_available BETWEEN 0 AND inventory_total',
)
@Check('ticket_types_inventory_positive', 'inventory_total > 0')
@Check('ticket_types_currency_iso_format', "currency ~ '^[A-Z]{3}$'")
@Check('ticket_types_price_non_negative', 'price >= 0')
@Check('ticket_types_name_not_blank', "btrim(name) <> ''")
export class TicketType {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'ticket_types_pkey',
  })
  declare id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  declare eventId: string;

  @ManyToOne(() => Event, (event) => event.ticketTypes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'event_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'ticket_types_event_fk',
  })
  declare event: Relation<Event>;

  @OneToMany(() => Reservation, (reservation) => reservation.ticketType)
  declare reservations: Relation<Reservation[]>;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  declare name: string;

  @Column({ name: 'price', type: 'integer' })
  declare price: number;

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  declare currency: string;

  @Column({ name: 'inventory_total', type: 'int' })
  declare inventoryTotal: number;

  @Column({ name: 'inventory_available', type: 'int' })
  declare inventoryAvailable: number;

  @Column({ name: 'sales_start_at', type: 'timestamptz', nullable: true })
  declare salesStartAt: Date | null;

  @Column({ name: 'sales_end_at', type: 'timestamptz', nullable: true })
  declare salesEndAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
