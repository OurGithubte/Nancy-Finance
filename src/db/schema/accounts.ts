import { pgTable, text, timestamp, boolean, bigint, index } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().$type<"cash" | "bank" | "ewallet" | "savings" | "investment">(),
    balance: bigint("balance", { mode: "number" }).notNull().default(0), // VND in integer
    accountNumber: text("account_number"),
    bankCode: text("bank_code"),
    color: text("color").default("#10B981"),
    icon: text("icon").default("wallet"),
    isExcludedFromTotal: boolean("is_excluded_from_total").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("financial_accounts_user_idx").on(table.userId),
  ]
);
