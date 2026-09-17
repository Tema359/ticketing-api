import { MigrationInterface, QueryRunner } from 'typeorm';

export class Schema1789679867614 implements MigrationInterface {
  name = 'Schema1789679867614';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "reservation_id" uuid NOT NULL, "payment_id" uuid NOT NULL, "ticket_type_id" uuid NOT NULL, "owner_id" uuid NOT NULL, "admission_code" character varying(128) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'valid', "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "tickets_admission_code_unique" UNIQUE ("admission_code"), CONSTRAINT "tickets_admission_code_not_blank" CHECK (btrim(admission_code) <> ''), CONSTRAINT "tickets_status_valid" CHECK (status IN ('valid', 'used', 'void')), CONSTRAINT "tickets_used_at_required_when_used" CHECK (status <> 'used' OR used_at IS NOT NULL), CONSTRAINT "tickets_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "reservation_id" uuid NOT NULL, "provider" character varying(50) NOT NULL, "provider_payment_id" character varying(255), "amount" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "payments_provider_reference_unique" UNIQUE ("provider", "provider_payment_id"), CONSTRAINT "payments_id_reservation_unique" UNIQUE ("id", "reservation_id"), CONSTRAINT "payments_provider_not_blank" CHECK (btrim(provider) <> ''), CONSTRAINT "payments_amount_non_negative" CHECK (amount >= 0), CONSTRAINT "payments_currency_iso_format" CHECK (currency ~ '^[A-Z]{3}$'), CONSTRAINT "payments_status_valid" CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')), CONSTRAINT "payments_paid_at_required_for_success" CHECK (status <> 'succeeded' OR paid_at IS NOT NULL), CONSTRAINT "payments_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "payments_one_success_per_reservation_idx" ON "payments" ("reservation_id") WHERE status = 'succeeded'`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "ticket_type_id" uuid NOT NULL, "quantity" integer NOT NULL, "unit_price" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "idempotency_key" character varying(255) NOT NULL, "request_fingerprint" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "reservations_user_idempotency_unique" UNIQUE ("user_id", "idempotency_key"), CONSTRAINT "reservations_id_ticket_type_unique" UNIQUE ("id", "ticket_type_id"), CONSTRAINT "reservations_quantity_positive" CHECK (quantity > 0), CONSTRAINT "reservations_unit_price_non_negative" CHECK (unit_price >= 0), CONSTRAINT "reservations_currency_iso_format" CHECK (currency ~ '^[A-Z]{3}$'), CONSTRAINT "reservations_status_valid" CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')), CONSTRAINT "reservations_idempotency_key_not_blank" CHECK (btrim(idempotency_key) <> ''), CONSTRAINT "reservations_fingerprint_sha256_format" CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'), CONSTRAINT "reservations_expiry_valid" CHECK (expires_at > created_at), CONSTRAINT "reservations_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ticket_types" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "event_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "price" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL, "inventory_total" integer NOT NULL, "inventory_available" integer NOT NULL, "sales_start_at" TIMESTAMP WITH TIME ZONE, "sales_end_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ticket_types_event_name_unique" UNIQUE ("event_id", "name"), CONSTRAINT "ticket_types_name_not_blank" CHECK (btrim(name) <> ''), CONSTRAINT "ticket_types_price_non_negative" CHECK (price >= 0), CONSTRAINT "ticket_types_currency_iso_format" CHECK (currency ~ '^[A-Z]{3}$'), CONSTRAINT "ticket_types_inventory_positive" CHECK (inventory_total > 0), CONSTRAINT "ticket_types_inventory_available_valid" CHECK (inventory_available BETWEEN 0 AND inventory_total), CONSTRAINT "ticket_types_sales_range_valid" CHECK (sales_start_at IS NULL OR sales_end_at IS NULL OR sales_end_at > sales_start_at), CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (current_database(), current_schema(), $1, $2, $3, $4)`,
      [
        'events',
        'GENERATED_COLUMN',
        'search_vector',
        "to_tsvector('simple', title || ' ' || coalesce(description, ''))",
      ],
    );
    await queryRunner.query(
      `CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "organizer_id" uuid NOT NULL, "title" character varying(200) NOT NULL, "description" text, "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', title || ' ' || coalesce(description, ''))) STORED, "venue_name" character varying(200) NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "events_title_not_blank" CHECK (btrim(title) <> ''), CONSTRAINT "events_venue_name_not_blank" CHECK (btrim(venue_name) <> ''), CONSTRAINT "events_time_range_valid" CHECK (ends_at > starts_at), CONSTRAINT "events_status_valid" CHECK (status IN ('draft', 'published', 'cancelled', 'completed')), CONSTRAINT "events_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(320) NOT NULL, "role" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "users_email_unique" UNIQUE ("email"), CONSTRAINT "users_role_valid" CHECK (role IN ('attendee', 'organizer', 'admin')), CONSTRAINT "users_email_not_blank" CHECK (btrim(email) <> ''), CONSTRAINT "users_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reservation_ticket_type_fk" FOREIGN KEY ("reservation_id", "ticket_type_id") REFERENCES "reservations"("id","ticket_type_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "tickets_payment_reservation_fk" FOREIGN KEY ("payment_id", "reservation_id") REFERENCES "payments"("id","reservation_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "tickets_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_fk" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "reservations_ticket_type_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_event_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "events_organizer_fk" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "tickets_owner_issued_at_idx" ON "tickets" ("owner_id", "issued_at" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "payments_failed_created_at_idx" ON "payments" ("created_at" DESC, "id" DESC) WHERE status = 'failed'`,
    );
    await queryRunner.query(
      `CREATE INDEX "users_email_lower_pattern_idx" ON "users" (lower("email") text_pattern_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "events_search_vector_idx" ON "events" USING GIN ("search_vector")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."events_search_vector_idx"`);
    await queryRunner.query(`DROP INDEX "public"."users_email_lower_pattern_idx"`);
    await queryRunner.query(`DROP INDEX "public"."payments_failed_created_at_idx"`);
    await queryRunner.query(`DROP INDEX "public"."tickets_owner_issued_at_idx"`);
    await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "events_organizer_fk"`);
    await queryRunner.query(`ALTER TABLE "ticket_types" DROP CONSTRAINT "ticket_types_event_fk"`);
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "reservations_ticket_type_fk"`,
    );
    await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "reservations_user_fk"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "payments_reservation_fk"`);
    await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "tickets_owner_fk"`);
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "tickets_payment_reservation_fk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "tickets_reservation_ticket_type_fk"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = current_database() AND "schema" = current_schema() AND "table" = $3`,
      ['GENERATED_COLUMN', 'search_vector', 'events'],
    );
    await queryRunner.query(`DROP TABLE "ticket_types"`);
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(`DROP INDEX "public"."payments_one_success_per_reservation_idx"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "tickets"`);
  }
}
