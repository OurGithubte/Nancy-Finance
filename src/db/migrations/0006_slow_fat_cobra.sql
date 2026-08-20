CREATE INDEX "cc_payments_card_date_idx" ON "credit_card_payments" USING btree ("credit_card_id","payment_date");--> statement-breakpoint
CREATE INDEX "cc_tx_card_date_idx" ON "credit_card_transactions" USING btree ("credit_card_id","transaction_date");--> statement-breakpoint
CREATE INDEX "loan_payments_loan_date_idx" ON "loan_payments" USING btree ("loan_id","payment_date");--> statement-breakpoint
CREATE INDEX "recurring_tx_user_idx" ON "recurring_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_tx_next_due_idx" ON "recurring_transactions" USING btree ("is_active","next_due_date");