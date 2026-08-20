CREATE TABLE "saving_goal_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"saving_goal_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"type" text NOT NULL,
	"transaction_date" timestamp DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saving_goal_contributions" ADD CONSTRAINT "saving_goal_contributions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saving_goal_contributions" ADD CONSTRAINT "saving_goal_contributions_saving_goal_id_saving_goals_id_fk" FOREIGN KEY ("saving_goal_id") REFERENCES "public"."saving_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saving_goal_contrib_user_idx" ON "saving_goal_contributions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saving_goal_contrib_goal_idx" ON "saving_goal_contributions" USING btree ("saving_goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_cat_month_year_unq" ON "budgets" USING btree ("user_id","category_id","month","year");