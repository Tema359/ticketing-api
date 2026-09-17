import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  Unique,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { UserRole } from '../users/enums/user-role.enum.js';
import { Event } from './event.entity.js';
import { Reservation } from './reservation.entity.js';
import { Ticket } from './ticket.entity.js';

@Entity('users')
@Check('users_email_not_blank', "btrim(email) <> ''")
@Check('users_role_valid', "role IN ('attendee', 'organizer', 'admin')")
@Unique('users_email_unique', ['email'])
export class User {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'users_pkey',
  })
  declare id: string;

  @Column({ type: 'varchar', length: 320 })
  declare email: string;

  @Column({ type: 'varchar', length: 20 })
  declare role: UserRole;

  @OneToMany(() => Event, (event) => event.organizer)
  declare organizedEvents: Relation<Event[]>;

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  declare reservations: Relation<Reservation[]>;

  @OneToMany(() => Ticket, (ticket) => ticket.owner)
  declare tickets: Relation<Ticket[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
