import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the two application-owned tables. financial_data is not touched here
 * — it arrives from the dump in docker/postgres and is read-only to this app.
 *
 * Two deliberate choices worth reading before editing:
 *
 * 1. created_at/updated_at default to clock_timestamp(), not now(). now() is
 *    the *transaction* timestamp, so several rows inserted in one transaction
 *    would share it to the microsecond. Message order is part of the product
 *    contract — a tie there means a reloaded conversation can come back
 *    scrambled. clock_timestamp() advances within a transaction and removes the
 *    tie at the source.
 *
 * 2. role carries a CHECK constraint. The column is a VARCHAR for flexibility,
 *    but only two values are ever legal, and a typo'd role would otherwise be
 *    stored happily and only surface as a malformed prompt sent to Claude.
 */
export class InitChatSchema1784332800000 implements MigrationInterface {
  name = 'InitChatSchema1784332800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id"         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id" varchar(64)  NOT NULL,
        "title"      varchar(255) NOT NULL DEFAULT 'New Chat',
        "created_at" timestamp    NOT NULL DEFAULT clock_timestamp(),
        "updated_at" timestamp    NOT NULL DEFAULT clock_timestamp(),
        "deleted_at" timestamp    NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_session_id" ON "conversations" ("session_id")`,
    );
    // DESC to match the only ordering the list endpoint ever uses.
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_updated_at" ON "conversations" ("updated_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id"              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" uuid          NOT NULL,
        "role"            varchar(20)   NOT NULL,
        "content"         text          NULL,
        "tool_calls"      jsonb         NULL,
        "tool_results"    jsonb         NULL,
        "input_tokens"    integer       NOT NULL DEFAULT 0,
        "output_tokens"   integer       NOT NULL DEFAULT 0,
        "cost"            decimal(10,6) NOT NULL DEFAULT 0,
        "is_partial"      boolean       NOT NULL DEFAULT false,
        "created_at"      timestamp     NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT "chk_messages_role" CHECK ("role" IN ('user', 'assistant')),
        CONSTRAINT "fk_messages_conversation" FOREIGN KEY ("conversation_id")
          REFERENCES "conversations" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_messages_conversation_id" ON "messages" ("conversation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_created_at" ON "messages" ("created_at" ASC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // messages first: the foreign key would block dropping conversations.
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
  }
}
