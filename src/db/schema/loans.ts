import { pgTable, text, timestamp, bigint, integer, numeric, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { financialAccounts } from "./accounts";

export const loans = pgTable(
  "loans",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    lenderName: text("lender_name").notNull(),
    type: text("type").notNull().$type<"car" | "home" | "consumer" | "business" | "student">().default("consumer"),
    totalAmount: bigint("total_amount", { mode: "number" }).notNull(), // VND in integer
    remainingAmount: bigint("remaining_amount", { mode: "number" }).notNull(), // VND in integer
    monthlyPayment: bigint("monthly_payment", { mode: "number" }).notNull(), // VND in integer
    interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull(), // % / year
    totalTerms: integer("total_terms").notNull(),
    remainingTerms: integer("remaining_terms").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    status: text("status").notNull().$type<"active" | "settled" | "defaulted">().default("active"),
    color: text("color").default("#DC2626"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("loans_user_idx").on(table.userId),
  ]
);

export const loanSchedules = pgTable(
  "loan_schedules",
  {
    id: text("id").primaryKey(),
    loanId: text("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),
    periodNumber: integer("period_number").notNull(),
    dueDate: timestamp("due_date").notNull(),
    principalAmount: bigint("principal_amount", { mode: "number" }).notNull(),
    interestAmount: bigint("interest_amount", { mode: "number" }).notNull(),
    totalDue: bigint("total_due", { mode: "number" }).notNull(),
    isPaid: boolean("is_paid").notNull().default(false),
    paidDate: timestamp("paid_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("loan_schedules_loan_idx").on(table.loanId),
  ]
);

export const loanPayments = pgTable(
  "loan_payments",
  {
    id: text("id").primaryKey(),
    loanId: text("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),
    fromAccountId: text("from_account_id").references(() => financialAccounts.id, {
      onDelete: "set null",
    }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    paymentDate: timestamp("payment_date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  }
);
