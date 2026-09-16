import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  Unique,
  PrimaryColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum.js';

@Entity('users')
@Check('users_email_not_blank', "btrim(email) <> ''")
@Check('users_role_valid', "role IN ('attendee', 'organizer', 'admin')")
@Unique('users_email_unique', ['email'])
export class User {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'users_pkey',
  })
  declare id: string;

  @Column({ type: 'varchar', length: 320 })
  declare email: string;

  @Column({ type: 'varchar', length: 20 })
  declare role: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  declare updatedAt: Date;
}
