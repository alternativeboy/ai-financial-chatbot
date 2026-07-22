import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Read-only projection of the table loaded from data/financial_data.sql.
 *
 * synchronize: false is load-bearing. This table is created by the Postgres
 * init scripts, not by a migration, and without this flag `migration:generate`
 * would notice the mismatch and emit a migration that recreates — and therefore
 * empties — the only copy of the dataset.
 *
 * The real table has no primary key; company + year is its natural one and is
 * declared here only so TypeORM accepts the entity.
 */
@Entity({ name: 'financial_data', synchronize: false })
export class FinancialData {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  company!: string;

  @PrimaryColumn({ type: 'int' })
  year!: number;

  @Column({ type: 'varchar', length: 255 })
  ticker!: string;

  @Column({ type: 'varchar', length: 255 })
  sector!: string;

  @Column({ type: 'bigint', nullable: true })
  revenue!: string | null;

  @Column({ name: 'net_income', type: 'bigint', nullable: true })
  netIncome!: string | null;

  @Column({ name: 'operating_income', type: 'bigint', nullable: true })
  operatingIncome!: string | null;

  @Column({ name: 'gross_profit', type: 'bigint', nullable: true })
  grossProfit!: string | null;
}
