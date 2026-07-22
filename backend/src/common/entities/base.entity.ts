import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Columns every application-owned table carries.
 *
 * financial_data deliberately does not extend this — it is read-only reference
 * data with no surrogate key, loaded from a dump rather than written by the app.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
