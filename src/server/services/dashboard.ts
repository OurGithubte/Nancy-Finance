import { db } from "@/db";
import { transactions, financialAccounts, categories } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { NetWorthService } from "./net-worth";
import { getPreviousPeriodDates } from "./reports";

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export class DashboardService {
  async getDashboardSummary(userId: string, periodStart: Date, periodEnd: Date) {
    const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriodDates(periodStart, periodEnd);

    // All five reads are independent. Run them in parallel so one Vercel request
    // pays one DB round-trip window instead of a waterfall of separate waits.
    const [accounts, nowSnapshot, prevSnapshot, periodTxs, prevTxs] = await Promise.all([
      db
        .select()
        .from(financialAccounts)
        .where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.isActive, true))),
      NetWorthService.getSnapshotAt(userId, new Date()),
      NetWorthService.getSnapshotAt(userId, prevStart),
      db
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
        ),
      db
        .select({ amount: transactions.amount, type: transactions.type })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.status, "completed"),
            gte(transactions.transactionDate, prevStart),
            lt(transactions.transactionDate, prevEnd)
          )
        ),
    ]);

    let availableCash = 0;
    for (const acc of accounts) {
      if (acc.type !== "investment") availableCash += acc.balance;
    }

    const netWorth = nowSnapshot.netWorth;
    const totalDebt = nowSnapshot.debt;

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
        netWorthGrowth: pctChange(netWorth, prevSnapshot.netWorth),
        incomeGrowth: pctChange(totalIncome, prevIncome),
        expenseGrowth: pctChange(totalExpense, prevExpense),
        debtGrowth: pctChange(totalDebt, prevSnapshot.debt),
      },
      expenseCategories: Object.values(expenseByCategory).sort((a, b) => b.amount - a.amount),
      accounts,
    };
  }

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
