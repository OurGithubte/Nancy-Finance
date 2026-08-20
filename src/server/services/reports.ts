import { db } from "@/db";
import {
  transactions,
  financialAccounts,
  categories,
  budgets,
  savingGoals,
  loans,
  creditCards,
} from "@/db/schema";
import { and, eq, gte, lt, desc, sql, sum, inArray, or } from "drizzle-orm";
import {
  FinancialReport,
  ReportPeriodType,
  KpiSummary,
  PeriodComparison,
  ExpenseCategoryShare,
  MonthlyCashflowPoint,
  BudgetPerformanceItem,
  SavingGoalProgressItem,
  DebtSummaryItem,
  TopExpenseItem,
} from "@/types/reports";

/**
 * Helper to parse dates strictly.
 */
function parseCustomDate(dateStr: string | null, isEnd: boolean = false): Date | null {
  if (!dateStr) return null;
  // Parse YYYY-MM-DD strictly as local time to avoid timezone shifts
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d, 0, 0, 0, 0);
    if (isNaN(date.getTime())) return null;
    
    if (isEnd) {
      date.setHours(23, 59, 59, 999);
      const exclusiveDate = new Date(date.getTime() + 1);
      return exclusiveDate;
    }
    return date;
  }
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Returns [startDate, endDate] where startDate is inclusive and endDate is exclusive.
 */
export function getReportPeriodDates(
  type: ReportPeriodType,
  customFrom?: string | null,
  customTo?: string | null
): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  if (type === "custom" && customFrom && customTo) {
    const start = parseCustomDate(customFrom);
    const end = parseCustomDate(customTo, true);
    if (start && end && start <= end) {
      return { startDate: start, endDate: end };
    }
  }

  // Fallback or default types based on current date
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  if (type === "last_month") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else if (type === "last_3_months") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  } else if (type === "last_6_months") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  } else if (type === "this_year") {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
  }

  return { startDate, endDate };
}

export function getPreviousPeriodDates(currentStartDate: Date, currentEndDate: Date): { startDate: Date; endDate: Date } {
  const diffTime = currentEndDate.getTime() - currentStartDate.getTime();
  const previousStartDate = new Date(currentStartDate.getTime() - diffTime);
  const previousEndDate = new Date(currentEndDate.getTime() - diffTime);
  return { startDate: previousStartDate, endDate: previousEndDate };
}

function calculateSavingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return ((income - expense) / income) * 100;
}

export class ReportService {
  /**
   * Generates a full financial report for a specific user and period.
   */
  static async getFinancialReport(
    userId: string,
    periodType: ReportPeriodType,
    customFrom?: string | null,
    customTo?: string | null
  ): Promise<FinancialReport> {
    const { startDate, endDate } = getReportPeriodDates(periodType, customFrom, customTo);
    
    // 1. Base transactions filter
    const baseFilter = and(
      eq(transactions.userId, userId),
      eq(transactions.status, "completed"),
      gte(transactions.transactionDate, startDate),
      lt(transactions.transactionDate, endDate)
    );

    // 2. Fetch KPIs (Income & Expense)
    const [incomeResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(baseFilter, eq(transactions.type, "income")));
    
    const [expenseResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(baseFilter, eq(transactions.type, "expense")));

    const totalIncome = Number(incomeResult?.total || 0);
    const totalExpense = Number(expenseResult?.total || 0);
    const netCashflow = totalIncome - totalExpense;
    const savingsRate = calculateSavingsRate(totalIncome, totalExpense);

    // 3. Current Assets (sum of financial accounts)
    const [assetsResult] = await db
      .select({ total: sum(financialAccounts.balance) })
      .from(financialAccounts)
      .where(eq(financialAccounts.userId, userId));
    const totalAssets = Number(assetsResult?.total || 0);

    // 4. Current Debt (sum of loan remaining amounts + credit card balances)
    const [loansResult] = await db
      .select({ total: sum(loans.remainingAmount) })
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.isActive, true)));
    
    const [ccResult] = await db
      .select({ total: sum(creditCards.currentBalance) })
      .from(creditCards)
      .where(and(eq(creditCards.userId, userId), eq(creditCards.isActive, true)));
    
    const totalDebt = Number(loansResult?.total || 0) + Number(ccResult?.total || 0);

    const summary: KpiSummary = {
      totalIncome,
      totalExpense,
      netCashflow,
      savingsRate,
      totalAssets,
      totalDebt,
    };

    // 5. Period Comparison
    const prevPeriod = getPreviousPeriodDates(startDate, endDate);
    const prevFilter = and(
      eq(transactions.userId, userId),
      eq(transactions.status, "completed"),
      gte(transactions.transactionDate, prevPeriod.startDate),
      lt(transactions.transactionDate, prevPeriod.endDate)
    );

    const [prevIncomeResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(prevFilter, eq(transactions.type, "income")));
    
    const [prevExpenseResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(prevFilter, eq(transactions.type, "expense")));
    
    const prevIncome = Number(prevIncomeResult?.total || 0);
    const prevExpense = Number(prevExpenseResult?.total || 0);
    const prevNetCashflow = prevIncome - prevExpense;
    const prevSavingsRate = calculateSavingsRate(prevIncome, prevExpense);

    const hasPreviousData = prevIncome > 0 || prevExpense > 0;
    
    const comparison: PeriodComparison = {
      incomeChange: prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : null,
      expenseChange: prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : null,
      netCashflowChange: hasPreviousData ? ((netCashflow - prevNetCashflow) / Math.abs(prevNetCashflow || 1)) * 100 : null,
      savingsRateChange: prevSavingsRate !== null && savingsRate !== null ? savingsRate - prevSavingsRate : null,
      hasPreviousData,
    };

    // 6. Expense Category Share
    const categoryGroupQuery = await db
      .select({
        categoryId: transactions.categoryId,
        amount: sum(transactions.amount),
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(and(baseFilter, eq(transactions.type, "expense")))
      .groupBy(transactions.categoryId)
      .orderBy(desc(sum(transactions.amount)));

    const categoryIds = categoryGroupQuery.map(c => c.categoryId).filter(Boolean) as string[];
    const categoryDetails = categoryIds.length > 0 ? await db.select().from(categories).where(inArray(categories.id, categoryIds)) : [];
    
    const expenseCategories: ExpenseCategoryShare[] = categoryGroupQuery.map((row, idx) => {
      const cat = categoryDetails.find(c => c.id === row.categoryId);
      const rowAmount = Number(row.amount);
      return {
        id: cat?.id || `unknown-${idx}`,
        name: cat?.name || "Khác",
        color: cat?.color || "#94a3b8",
        amount: rowAmount,
        percentage: totalExpense > 0 ? Number(((rowAmount / totalExpense) * 100).toFixed(1)) : 0,
        transactionCount: Number(row.count),
      };
    });

    // 7. Cashflow Trend (Monthly by default)
    // Build a map of YYYY-MM
    const startYearMonth = startDate.getFullYear() * 12 + startDate.getMonth();
    const endYearMonth = endDate.getFullYear() * 12 + endDate.getMonth();
    
    const monthsMap = new Map<string, MonthlyCashflowPoint>();
    for (let m = startYearMonth; m <= endYearMonth; m++) {
      const y = Math.floor(m / 12);
      const month = m % 12;
      // if exclusive end date is 1st of month, don't include it unless start==end
      if (y === endDate.getFullYear() && month === endDate.getMonth() && m !== startYearMonth) {
        continue; // exclude the boundary month if it's the exact exclusive bound
      }
      const label = `T${(month + 1).toString().padStart(2, "0")}/${y.toString().slice(2)}`;
      monthsMap.set(`${y}-${month}`, { month: label, income: 0, expense: 0, netCashflow: 0 });
    }

    const trendQuery = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.transactionDate,
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.status, "completed"),
        gte(transactions.transactionDate, startDate),
        lt(transactions.transactionDate, endDate),
        inArray(transactions.type, ["income", "expense"])
      ));

    for (const tx of trendQuery) {
      const d = tx.date;
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${m}`;
      if (monthsMap.has(key)) {
        const point = monthsMap.get(key)!;
        if (tx.type === "income") point.income += tx.amount;
        if (tx.type === "expense") point.expense += tx.amount;
        point.netCashflow = point.income - point.expense;
      }
    }
    const cashflowTrend = Array.from(monthsMap.values());

    // 8. Budget Performance
    const relevantMonths = Array.from(new Set(Array.from(monthsMap.keys()))).map(k => {
      const [y, m] = k.split("-");
      return { year: parseInt(y), month: parseInt(m) + 1 }; // DB uses 1-12
    });

    let budgetPerformance: BudgetPerformanceItem[] = [];
    if (relevantMonths.length > 0) {
      const budgetConditions = relevantMonths.map(rm => 
        and(eq(budgets.year, rm.year), eq(budgets.month, rm.month))
      );
      
      const allBudgets = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.userId, userId),
            or(...budgetConditions)
          )
        );

      if (allBudgets.length > 0) {
        // We have budgets, let's join with categories and sum up spent if they span multiple months for the same category
        const budgetCatIds = [...new Set(allBudgets.map(b => b.categoryId))];
        const bCats = await db.select().from(categories).where(inArray(categories.id, budgetCatIds));
        
        const catMap = new Map<string, BudgetPerformanceItem>();
        for (const b of allBudgets) {
          const c = bCats.find(cat => cat.id === b.categoryId);
          if (!catMap.has(b.categoryId)) {
            catMap.set(b.categoryId, {
              categoryId: b.categoryId,
              categoryName: c?.name || "Không rõ",
              allocatedAmount: 0,
              spentAmount: 0,
              remainingAmount: 0,
              usagePercentage: 0,
              status: "healthy",
            });
          }
          const item = catMap.get(b.categoryId)!;
          item.allocatedAmount += b.allocatedAmount;
          item.spentAmount += b.spentAmount;
        }

        budgetPerformance = Array.from(catMap.values()).map(item => {
          item.remainingAmount = item.allocatedAmount - item.spentAmount;
          item.usagePercentage = item.allocatedAmount > 0 ? (item.spentAmount / item.allocatedAmount) * 100 : 0;
          if (item.usagePercentage >= 100) item.status = "over_budget";
          else if (item.usagePercentage >= 80) item.status = "warning";
          return item;
        });
      }
    }

    // 9. Saving Goals
    const userSavingGoals = await db
      .select()
      .from(savingGoals)
      .where(eq(savingGoals.userId, userId));
    
    const savingGoalsResult: SavingGoalProgressItem[] = userSavingGoals.map(sg => {
      const progress = sg.targetAmount > 0 ? (sg.currentAmount / sg.targetAmount) * 100 : 0;
      return {
        id: sg.id,
        name: sg.name,
        targetAmount: sg.targetAmount,
        currentAmount: sg.currentAmount,
        remainingAmount: Math.max(0, sg.targetAmount - sg.currentAmount),
        progressPercentage: progress,
        targetDate: sg.targetDate,
        status: sg.status,
      };
    });

    // 10. Debts
    const userLoans = await db
      .select()
      .from(loans)
      .where(and(eq(loans.userId, userId), eq(loans.isActive, true)));
    
    const userCards = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.userId, userId), eq(creditCards.isActive, true)));
    
    const debts: DebtSummaryItem[] = [];
    userLoans.forEach(l => {
      debts.push({
        id: l.id,
        type: "loan",
        name: l.name,
        lenderOrBank: l.lenderName,
        originalAmountOrLimit: l.totalAmount,
        remainingOrCurrentBalance: l.remainingAmount,
        monthlyPaymentOrMinDue: l.monthlyPayment,
        paidPercentage: l.totalAmount > 0 ? ((l.totalAmount - l.remainingAmount) / l.totalAmount) * 100 : 0,
        dueDate: null, // Could fetch next schedule here if needed
        status: l.status,
      });
    });

    userCards.forEach(c => {
      debts.push({
        id: c.id,
        type: "credit_card",
        name: c.name,
        lenderOrBank: c.bankName,
        originalAmountOrLimit: c.creditLimit,
        remainingOrCurrentBalance: c.currentBalance,
        monthlyPaymentOrMinDue: 0, // Would need to join statements to get actual min due
        dueDate: null, 
        status: c.currentBalance > 0 ? "active" : "good",
      });
    });

    // 11. Top Expenses
    const topExpensesQuery = await db
      .select({
        id: transactions.id,
        date: transactions.transactionDate,
        note: transactions.note,
        amount: transactions.amount,
        categoryId: transactions.categoryId,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .where(and(baseFilter, eq(transactions.type, "expense")))
      .orderBy(desc(transactions.amount))
      .limit(10);

    const allCatIds = topExpensesQuery.map(t => t.categoryId).filter(Boolean) as string[];
    const allAccIds = topExpensesQuery.map(t => t.accountId).filter(Boolean) as string[];
    
    const [topCats, topAccs] = await Promise.all([
      allCatIds.length > 0 ? db.select().from(categories).where(inArray(categories.id, allCatIds)) : [],
      allAccIds.length > 0 ? db.select().from(financialAccounts).where(inArray(financialAccounts.id, allAccIds)) : [],
    ]);

    const topExpenses: TopExpenseItem[] = topExpensesQuery.map(t => ({
      id: t.id,
      date: t.date,
      description: t.note || "Không có ghi chú",
      categoryName: topCats.find(c => c.id === t.categoryId)?.name || "Khác",
      accountName: topAccs.find(a => a.id === t.accountId)?.name || "Không rõ",
      amount: t.amount,
    }));

    return {
      period: {
        type: periodType,
        startDate,
        endDate,
      },
      summary,
      comparison,
      expenseCategories,
      cashflowTrend,
      budgetPerformance,
      savingGoals: savingGoalsResult,
      debts,
      topExpenses,
    };
  }
}
