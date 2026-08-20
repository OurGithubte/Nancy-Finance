ALTER TABLE "transactions" ADD COLUMN "recurring_transaction_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurring_occurrence_date" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_recurring_occurrence_unq" ON "transactions" USING btree ("recurring_transaction_id","recurring_occurrence_date");