import { db } from "@/db";
import { transactions, financialAccounts, categories } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { NetWorthService } from "./net-worth";
import { getPreviousPeriodDates } from "./reports";

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null; // no meaningful baseline -> N/A, never fabricate 0%
  return ((current - previous) / Math.abs(previous)) * 100;
}

export class DashboardService {
  /**
   * `periodStart`/`periodEnd` follow [start, endExclusive) VN-calendar semantics —
   * callers (the dashboard page) are responsible for computing them via
   * `getReportPeriodDates` so timezone/boundary handling stays in one place.
   */
  async getDashboardSummary(userId: string, periodStart: Date, periodEnd: Date) {
    // 1. Get Accounts (for Available Cash) — active accounts only for display
    const accounts = await db
      .select()
      .from(financialAccounts)
      .where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.isActive, true)));

    let availableCash = 0;
    for (const acc of accounts) {
      if (acc.type !== "investment") {
        availableCash += acc.balance;
      }
    }

    // 2. Snapshot metrics (Net Worth = Total Assets - Total Debt) at "now"
    // and at the start of the previous equal-length period, reconstructed
    // via the same engine used for the historical Net Worth trend so the
    // semantics never drift between the two.
    const { startDate: prevPeriodStart } = getPreviousPeriodDates(periodStart, periodEnd);
    const [nowSnapshot, prevSnapshot] = await Promise.all([
      NetWorthService.getSnapshotAt(userId, new Date()),
      NetWorthService.getSnapshotAt(userId, prevPeriodStart),
    ]);

    const netWorth = nowSnapshot.netWorth;
    const totalDebt = nowSnapshot.debt;

    // 3. Period transactions (income/expense only — transfers never affect flow metrics)
    const periodTxs = await db
      .select({
        amount: transactions.amount,
        type: transactions.type,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "completed"),
          gte(transactions.transactionDate, periodStart),
          lt(transactions.transactionDate, periodEnd)
        )
      );

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, { name: string; color: string; amount: number }> = {};

    for (const tx of periodTxs) {
      if (tx.type === "income") {
        totalIncome += tx.amount;
      } else if (tx.type === "expense") {
        totalExpense += tx.amount;
        if (tx.categoryName && tx.categoryColor) {
          if (!expenseByCategory[tx.categoryName]) {
            expenseByCategory[tx.categoryName] = {
              name: tx.categoryName,
              color: tx.categoryColor,
              amount: 0,
            };
          }
          expenseByCategory[tx.categoryName].amount += tx.amount;
        }
      }
    }

    const expenseCategories = Object.values(expenseByCategory).sort((a, b) => b.amount - a.amount);

    // 4. Previous period income/expense for growth comparison (flow metrics)
    const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriodDates(periodStart, periodEnd);
    const prevTxs = await db
      .select({ amount: transactions.amount, type: transactions.type })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "completed"),
          gte(transactions.transactionDate, prevStart),
          lt(transactions.transactionDate, prevEnd)
        )
      );
    let prevIncome = 0;
    let prevExpense = 0;
    for (const tx of prevTxs) {
      if (tx.type === "income") prevIncome += tx.amount;
      else if (tx.type === "expense") prevExpense += tx.amount;
    }

    return {
      kpiSummary: {
        netWorth,
        availableCash,
        totalIncome,
        totalExpense,
        totalDebt,
        // null means "not enough data to compute a meaningful change" -> UI must show N/A, never fabricate 0%.
        netWorthGrowth: pctChange(netWorth, prevSnapshot.netWorth),
        incomeGrowth: pctChange(totalIncome, prevIncome),
        expenseGrowth: pctChange(totalExpense, prevExpense),
        debtGrowth: pctChange(totalDebt, prevSnapshot.debt),
      },
      expenseCategories,
      accounts,
    };
  }

  // Monthly cashflow for the last 6 months, grouped explicitly in Asia/Ho_Chi_Minh
  async getCashflowTrend(userId: string) {
    const result = await db.execute(sql`
      SELECT
        to_char(date_trunc('month', transaction_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'Mon') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ${userId}
        AND status = 'completed'
        AND transaction_date >= (date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '5 months'))
      GROUP BY date_trunc('month', transaction_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      ORDER BY date_trunc('month', transaction_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') ASC
    `);

    return result.rows.map((row) => ({
      month: row.month as string,
      income: Number(row.income),
      expense: Number(row.expense),
    }));
  }
}

export const dashboardService = new DashboardService();
