ALTER TABLE "loan_schedules" ALTER COLUMN "is_paid" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "loan_schedules" ALTER COLUMN "is_paid" SET DATA TYPE boolean USING (CASE WHEN is_paid = 'paid' OR is_paid = 'true' THEN true ELSE false END);--> statement-breakpoint
ALTER TABLE "loan_schedules" ALTER COLUMN "is_paid" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "financial_events" ALTER COLUMN "is_completed" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "financial_events" ALTER COLUMN "is_completed" SET DATA TYPE boolean USING (CASE WHEN is_completed = 'true' THEN true ELSE false END);--> statement-breakpoint
ALTER TABLE "financial_events" ALTER COLUMN "is_completed" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ALTER COLUMN "is_active" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ALTER COLUMN "is_active" SET DATA TYPE boolean USING (CASE WHEN is_active = 'true' OR is_active = 'active' THEN true ELSE false END);--> statement-breakpoint
ALTER TABLE "recurring_transactions" ALTER COLUMN "is_active" SET DEFAULT true;