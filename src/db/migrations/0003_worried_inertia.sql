ALTER TABLE "credit_cards" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;