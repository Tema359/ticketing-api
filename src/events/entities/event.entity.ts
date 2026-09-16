import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  PrimaryColumn,
  Index,
} from 'typeorm';
import { EventStatus } from '../enums/event-status.enum.js';

@Entity('events')
@Check('events_status_valid', "status IN ('draft', 'published', 'cancelled', 'completed')")
@Check('events_time_range_valid', 'ends_at > starts_at')
@Check('events_venue_name_not_blank', "btrim(venue_name) <> ''")
@Check('events_title_not_blank', "btrim(title) <> ''")
export class Event {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'events_pkey',
  })
  declare id: string;

  @Column({ name: 'organizer_id', type: 'uuid' })
  declare organizerId: string;

  @Column({ type: 'varchar', length: 200 })
  declare title: string;

  @Column({ type: 'text', nullable: true })
  declare description: string | null;

  @Index('idx_events_search_vector', { synchronize: false })
  @Column({
    name: 'search_vector',
    type: 'tsvector',
    asExpression: "to_tsvector('simple', title || ' ' || coalesce(description, ''))",
    generatedType: 'STORED',
    nullable: true,
  })
  declare searchVector: string | null;

  @Column({ name: 'venue_name', type: 'varchar', length: 200 })
  declare venueName: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  declare startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  declare endsAt: Date;

  @Column({ type: 'varchar', length: 20, default: EventStatus.DRAFT })
  declare status: EventStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
