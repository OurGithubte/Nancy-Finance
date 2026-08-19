import { pgTable, text, timestamp, bigint, integer, index } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { categories } from "./categories";
import { financialAccounts } from "./accounts";

export const budgets = pgTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    allocatedAmount: bigint("allocated_amount", { mode: "number" }).notNull(), // VND
    spentAmount: bigint("spent_amount", { mode: "number" }).notNull().default(0), // VND
    month: integer("month").notNull(), // 1-12
    year: integer("year").notNull(), // e.g. 2025
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("budgets_user_month_year_idx").on(table.userId, table.year, table.month),
  ]
);

export const savingGoals = pgTable(
  "saving_goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: bigint("target_amount", { mode: "number" }).notNull(), // VND
    currentAmount: bigint("current_amount", { mode: "number" }).notNull().default(0), // VND
    targetDate: timestamp("target_date"),
    icon: text("icon").default("target"),
    color: text("color").default("#8B5CF6"),
    status: text("status").notNull().default("in_progress"), // in_progress, achieved, cancelled
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("saving_goals_user_idx").on(table.userId),
  ]
);

export const recurringTransactions = pgTable(
  "recurring_transactions",
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
    amount: bigint("amount", { mode: "number" }).notNull(),
    type: text("type").notNull().$type<"income" | "expense">(),
    frequency: text("frequency").notNull().default("monthly"), // daily, weekly, monthly, yearly
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    nextDueDate: timestamp("next_due_date").notNull(),
    isActive: text("is_active").notNull().default("active"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  }
);

export const financialEvents = pgTable(
  "financial_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    amount: bigint("amount", { mode: "number" }),
    eventType: text("event_type").notNull().default("bill_due"), // bill_due, salary, loan_due, cc_due
    eventDate: timestamp("event_date").notNull(),
    isCompleted: text("is_completed").notNull().default("false"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("financial_events_user_date_idx").on(table.userId, table.eventDate),
  ]
);
