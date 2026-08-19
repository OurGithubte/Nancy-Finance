import { pgTable, text, timestamp, bigint, index } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { financialAccounts } from "./accounts";
import { categories } from "./categories";

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    toAccountId: text("to_account_id").references(() => financialAccounts.id, {
      onDelete: "set null",
    }), // For transfers
    type: text("type").notNull().$type<"income" | "expense" | "transfer">(),
    amount: bigint("amount", { mode: "number" }).notNull(), // VND in integer
    transactionDate: timestamp("transaction_date").notNull(),
    note: text("note"),
    status: text("status")
      .notNull()
      .$type<"completed" | "pending" | "cancelled">()
      .default("completed"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("transactions_user_date_idx").on(table.userId, table.transactionDate),
    index("transactions_account_idx").on(table.accountId),
    index("transactions_category_idx").on(table.categoryId),
  ]
);
