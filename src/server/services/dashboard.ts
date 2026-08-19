import { db } from "@/db";
import { transactions, financialAccounts, categories, creditCards, loans } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export class DashboardService {
  async getDashboardSummary(userId: string, periodStart: Date, periodEnd: Date) {
    // 1. Get Accounts (for Net Worth, Available Cash, Total Debt)
    const accounts = await db
      .select()
      .from(financialAccounts)
      .where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.isActive, true)));

    let netWorth = 0;
    let availableCash = 0;
    let totalDebt = 0;

    for (const acc of accounts) {
      const bal = acc.balance; // It's a number
      if (!acc.isExcludedFromTotal) {
        netWorth += bal;
      }
      if (acc.type !== "investment") { // basic assumption for cash
        availableCash += bal;
      }
    }

    const cards = await db.query.creditCards.findMany({
      where: and(eq(creditCards.userId, userId), eq(creditCards.isActive, true)),
    });
    const allLoans = await db.query.loans.findMany({
      where: and(eq(loans.userId, userId), eq(loans.isActive, true)),
    });

    for (const card of cards) {
      totalDebt += card.currentBalance;
    }
    for (const loan of allLoans) {
      totalDebt += loan.remainingAmount;
    }

    // 2. Get Month Transactions
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
          gte(transactions.transactionDate, periodStart),
          lte(transactions.transactionDate, periodEnd)
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

    return {
      kpiSummary: {
        netWorth,
        availableCash,
        totalIncome,
        totalExpense,
        totalDebt,
        netWorthGrowth: 0, // Mock for Phase 1
        incomeGrowth: 0, // Mock for Phase 1
        expenseGrowth: 0, // Mock for Phase 1
        debtGrowth: 0, // Mock for Phase 1
      },
      expenseCategories,
      accounts,
      // Recent transactions can be fetched from transactionsService later
    };
  }

  // Monthly cashflow for the last 6 months
  async getCashflowTrend(userId: string) {
    // A simplified query to get monthly cashflow
    // Grouping by month in postgres: date_trunc('month', transaction_date)
    const result = await db.execute(sql`
      SELECT 
        to_char(date_trunc('month', transaction_date), 'Mon') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ${userId}
        AND transaction_date >= date_trunc('month', current_date - interval '5 months')
      GROUP BY date_trunc('month', transaction_date)
      ORDER BY date_trunc('month', transaction_date) ASC
    `);

    // result.rows will look like: { month: 'Jan', income: '1000', expense: '500' }
    return result.rows.map((row: any) => ({
      month: row.month,
      income: Number(row.income),
      expense: Number(row.expense),
    }));
  }
}

export const dashboardService = new DashboardService();
