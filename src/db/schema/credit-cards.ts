import { pgTable, text, timestamp, bigint, integer, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { financialAccounts } from "./accounts";

export const creditCards = pgTable(
  "credit_cards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bankName: text("bank_name").notNull(),
    cardNetwork: text("card_network").notNull().$type<"visa" | "mastercard" | "jcb" | "amex">().default("visa"),
    last4Digits: text("last4_digits").notNull(),
    creditLimit: bigint("credit_limit", { mode: "number" }).notNull(), // VND in integer
    currentBalance: bigint("current_balance", { mode: "number" }).notNull().default(0), // used limit
    statementDay: integer("statement_day").notNull().default(20), // 1-31
    dueDay: integer("due_day").notNull().default(5), // 1-31
    color: text("color").default("#3B82F6"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("credit_cards_user_idx").on(table.userId),
  ]
);

export const creditCardTransactions = pgTable(
  "credit_card_transactions",
  {
    id: text("id").primaryKey(),
    creditCardId: text("credit_card_id")
      .notNull()
      .references(() => creditCards.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    description: text("description").notNull(),
    category: text("category"),
    transactionDate: timestamp("transaction_date").notNull(),
    status: text("status").notNull().$type<"posted" | "pending" | "cancelled">().default("posted"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("cc_tx_card_idx").on(table.creditCardId),
    index("cc_tx_card_date_idx").on(table.creditCardId, table.transactionDate),
  ]
);

export const creditCardStatements = pgTable(
  "credit_card_statements",
  {
    id: text("id").primaryKey(),
    creditCardId: text("credit_card_id")
      .notNull()
      .references(() => creditCards.id, { onDelete: "cascade" }),
    statementDate: timestamp("statement_date").notNull(),
    dueDate: timestamp("due_date").notNull(),
    totalDue: bigint("total_due", { mode: "number" }).notNull(),
    minPaymentDue: bigint("min_payment_due", { mode: "number" }).notNull(),
    isPaid: text("is_paid").notNull().$type<"unpaid" | "partial" | "paid">().default("unpaid"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("cc_statements_card_idx").on(table.creditCardId),
  ]
);

export const creditCardPayments = pgTable(
  "credit_card_payments",
  {
    id: text("id").primaryKey(),
    creditCardId: text("credit_card_id")
      .notNull()
      .references(() => creditCards.id, { onDelete: "cascade" }),
    fromAccountId: text("from_account_id").references(() => financialAccounts.id, {
      onDelete: "set null",
    }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    paymentDate: timestamp("payment_date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("cc_payments_card_date_idx").on(table.creditCardId, table.paymentDate),
  ]
);
