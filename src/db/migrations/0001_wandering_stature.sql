ALTER TABLE "loan_schedules" ALTER COLUMN "is_paid" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "loan_schedules" ALTER COLUMN "is_paid" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "financial_events" ALTER COLUMN "is_completed" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "financial_events" ALTER COLUMN "is_completed" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ALTER COLUMN "is_active" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ALTER COLUMN "is_active" SET DEFAULT true;