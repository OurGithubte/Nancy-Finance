import { db } from "@/db";
import {
  transactions,
  financialAccounts,
  categories,
  budgets,
  savingGoals,
  loans,
  loanPayments,
  creditCards,
  creditCardTransactions,
  creditCardPayments,
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
 * Build an exact Date object for a given YYYY-MM-DD in Asia/Ho_Chi_Minh (+07:00)
 */
export function createVNDate(year: number, month: number, day: number): Date {
  const y = year.toString().padStart(4, "0");
  const m = month.toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  // ISO string with +07:00 offset ensures exact boundary
  return new Date(`${y}-${m}-${d}T00:00:00+07:00`);
}

/**
 * Extract Y, M, D explicitly in Asia/Ho_Chi_Minh timezone
 */
export function getVNDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  
  const y = parseInt(parts.find(p => p.type === "year")!.value, 10);
  const m = parseInt(parts.find(p => p.type === "month")!.value, 10);
  const d = parseInt(parts.find(p => p.type === "day")!.value, 10);
  return { y, m, d };
}

export class InvalidReportPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidReportPeriodError";
  }
}

function parseCustomDate(dateStr: string | null, isEnd: boolean = false): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    
    if (isEnd) {
      // For exclusive end date, we add 1 day to the parsed date
      // Javascript Date will correctly wrap months/years if we add to getDate()
      const temp = new Date(Date.UTC(y, m - 1, d));
      temp.setUTCDate(temp.getUTCDate() + 1);
      return createVNDate(temp.getUTCFullYear(), temp.getUTCMonth() + 1, temp.getUTCDate());
    }
    return createVNDate(y, m, d);
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
  // Use current time in VN to determine "now"
  const nowVN = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const currYear = nowVN.getFullYear();
  const currMonth = nowVN.getMonth() + 1; // 1-12
  
  if (type === "custom") {
    // Custom period requires explicit, valid, ordered dates. We deliberately do
    // NOT silently fall back to another period type here: silent fallback would
    // hide a user mistake (e.g. from > to) behind data for the wrong period.
    if (!customFrom || !customTo) {
      throw new InvalidReportPeriodError("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
    }
    const start = parseCustomDate(customFrom);
    const end = parseCustomDate(customTo, true);
    if (!start || !end) {
      throw new InvalidReportPeriodError("Định dạng ngày không hợp lệ.");
    }
    if (start > end) {
      throw new InvalidReportPeriodError("Ngày bắt đầu phải trước ngày kết thúc.");
    }
    return { startDate: start, endDate: end };
  }

  // Fallback or default types based on current date
  let startDate = createVNDate(currYear, currMonth, 1);
  // End of month is 1st of next month
  let endDate = currMonth === 12 ? createVNDate(currYear + 1, 1, 1) : createVNDate(currYear, currMonth + 1, 1);

  if (type === "last_month") {
    startDate = currMonth === 1 ? createVNDate(currYear - 1, 12, 1) : createVNDate(currYear, currMonth - 1, 1);
    endDate = createVNDate(currYear, currMonth, 1);
  } else if (type === "last_3_months") {
    // 3 months including this month or 3 previous? "3 tháng gần nhất" usually means last 3 months up to now.
    // We'll define it as (currMonth - 2) to (currMonth + 1) -> 3 full months
    const startTemp = new Date(Date.UTC(currYear, currMonth - 1 - 2, 1));
    startDate = createVNDate(startTemp.getUTCFullYear(), startTemp.getUTCMonth() + 1, 1);
    endDate = currMonth === 12 ? createVNDate(currYear + 1, 1, 1) : createVNDate(currYear, currMonth + 1, 1);
  } else if (type === "last_6_months") {
    const startTemp = new Date(Date.UTC(currYear, currMonth - 1 - 5, 1));
    startDate = createVNDate(startTemp.getUTCFullYear(), startTemp.getUTCMonth() + 1, 1);
    endDate = currMonth === 12 ? createVNDate(currYear + 1, 1, 1) : createVNDate(currYear, currMonth + 1, 1);
  } else if (type === "this_year") {
    startDate = createVNDate(currYear, 1, 1);
    endDate = createVNDate(currYear + 1, 1, 1);
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

    // 3. Current Assets Snapshot at endDate
    // Fetch full account rows (incl. createdAt) instead of a plain SQL sum, because an
    // account created AFTER endDate must contribute 0 to this historical snapshot — it
    // did not exist yet at that instant, even though it exists (with a balance) today.
    const allAccountsForAssets = await db
      .select({
        id: financialAccounts.id,
        balance: financialAccounts.balance,
        isExcluded: financialAccounts.isExcludedFromTotal,
        createdAt: financialAccounts.createdAt,
      })
      .from(financialAccounts)
      .where(eq(financialAccounts.userId, userId));

    const isAccountIncludedAt = (id: string | null): boolean => {
      if (!id) return false;
      const acc = allAccountsForAssets.find((a) => a.id === id);
      if (!acc) return false;
      if (acc.isExcluded) return false;
      if (acc.createdAt >= endDate) return false; // did not exist yet at endDate
      return true;
    };

    let totalAssets = allAccountsForAssets.reduce(
      (sum, a) => (isAccountIncludedAt(a.id) ? sum + a.balance : sum),
      0
    );

    // Adjust assets back to endDate if endDate is in the past
    const now = new Date();
    if (endDate < now) {
      // Only include transactions that involve accounts included in totalAssets (i.e.
      // accounts that existed AND were not excluded at endDate).
      const futureTxs = await db
        .select({
          type: transactions.type,
          amount: transactions.amount,
          accountId: transactions.accountId,
          toAccountId: transactions.toAccountId
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.status, "completed"),
            gte(transactions.transactionDate, endDate)
          )
        );

      for (const tx of futureTxs) {
        const fromIncluded = isAccountIncludedAt(tx.accountId);
        const toIncluded = isAccountIncludedAt(tx.toAccountId);

        if (tx.type === "income" && fromIncluded) {
          totalAssets -= tx.amount;
        }
        if (tx.type === "expense" && fromIncluded) {
          totalAssets += tx.amount;
        }
        if (tx.type === "transfer") {
          if (fromIncluded) totalAssets += tx.amount; // money left an included account
          if (toIncluded) totalAssets -= tx.amount; // money entered an included account
        }
      }
    }

    // 4. Current Debt Snapshot at endDate
    const userLoans = await db
      .select()
      .from(loans)
      .where(and(eq(loans.userId, userId), lt(loans.startDate, endDate))); // only loans started before endDate
      
    let totalDebt = 0;
    const debts: DebtSummaryItem[] = [];
    
    if (userLoans.length > 0) {
      const loanIds = userLoans.map(l => l.id);
      const futureLoanPayments = endDate < now ? await db
        .select({ loanId: loanPayments.loanId, amount: loanPayments.amount })
        .from(loanPayments)
        .where(and(inArray(loanPayments.loanId, loanIds), gte(loanPayments.paymentDate, endDate))) : [];
        
      for (const loan of userLoans) {
        let pastRemaining = loan.remainingAmount;
        if (endDate < now) {
          const futurePaid = futureLoanPayments.filter(p => p.loanId === loan.id).reduce((sum, p) => sum + p.amount, 0);
          pastRemaining += futurePaid;
        }
        totalDebt += pastRemaining;
        
        if (loan.isActive || pastRemaining > 0) {
          debts.push({
            id: loan.id,
            type: "loan",
            name: loan.name,
            lenderOrBank: loan.lenderName,
            originalAmountOrLimit: loan.totalAmount,
            remainingOrCurrentBalance: pastRemaining,
            monthlyPaymentOrMinDue: loan.monthlyPayment,
            paidPercentage: loan.totalAmount > 0 ? ((loan.totalAmount - pastRemaining) / loan.totalAmount) * 100 : 0,
            dueDate: null, 
            status: pastRemaining > 0 ? "active" : "settled",
          });
        }
      }
    }
    
    const userCards = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.userId, userId), lt(creditCards.createdAt, endDate)));
      
    if (userCards.length > 0) {
      const cardIds = userCards.map(c => c.id);
      const futureCcTxs = endDate < now ? await db
        .select({ cardId: creditCardTransactions.creditCardId, amount: creditCardTransactions.amount })
        .from(creditCardTransactions)
        .where(and(
          inArray(creditCardTransactions.creditCardId, cardIds), 
          gte(creditCardTransactions.transactionDate, endDate),
          eq(creditCardTransactions.status, "posted")
        )) : [];
        
      const futureCcPayments = endDate < now ? await db
        .select({ cardId: creditCardPayments.creditCardId, amount: creditCardPayments.amount })
        .from(creditCardPayments)
        .where(and(inArray(creditCardPayments.creditCardId, cardIds), gte(creditCardPayments.paymentDate, endDate))) : [];
        
      for (const card of userCards) {
        let pastBalance = card.currentBalance;
        if (endDate < now) {
          const futureSpent = futureCcTxs.filter(t => t.cardId === card.id).reduce((sum, t) => sum + t.amount, 0);
          const futurePaid = futureCcPayments.filter(p => p.cardId === card.id).reduce((sum, p) => sum + p.amount, 0);
          pastBalance = pastBalance - futureSpent + futurePaid;
        }
        totalDebt += pastBalance;
        
        if (card.isActive || pastBalance > 0) {
          debts.push({
            id: card.id,
            type: "credit_card",
            name: card.name,
            lenderOrBank: card.bankName,
            originalAmountOrLimit: card.creditLimit,
            remainingOrCurrentBalance: pastBalance,
            monthlyPaymentOrMinDue: 0,
            dueDate: null, 
            status: pastBalance > 0 ? "active" : "good",
          });
        }
      }
    }

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
    const categoryDetails = categoryIds.length > 0 ? await db.select().from(categories).where(and(inArray(categories.id, categoryIds), eq(categories.userId, userId))) : [];
    
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
    // Build a map of YYYY-MM explicitly via VN time
    const startParts = getVNDateParts(startDate);
    const endParts = getVNDateParts(endDate);
    const startYearMonth = startParts.y * 12 + startParts.m;
    const endYearMonth = endParts.y * 12 + endParts.m;
    
    const monthsMap = new Map<string, MonthlyCashflowPoint>();
    for (let m = startYearMonth; m <= endYearMonth; m++) {
      const y = Math.floor(m / 12);
      let month = m % 12;
      let year = y;
      if (month === 0) {
        month = 12;
        year = y - 1;
      }
      
      // if exclusive end date is 1st of month, don't include it unless start==end
      if (year === endParts.y && month === endParts.m && m !== startYearMonth && endParts.d === 1) {
        continue; // exclude the boundary month if it's the exact exclusive bound
      }
      const label = `T${month.toString().padStart(2, "0")}/${year.toString().slice(2)}`;
      monthsMap.set(`${year}-${month}`, { month: label, income: 0, expense: 0, netCashflow: 0 });
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
      const parts = getVNDateParts(tx.date);
      const key = `${parts.y}-${parts.m}`;
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
      return { year: parseInt(y), month: parseInt(m) }; // DB uses 1-12
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
        const budgetCatIds = [...new Set(allBudgets.map(b => b.categoryId))];
        // Enforce user isolation on category lookup
        const bCats = await db
          .select()
          .from(categories)
          .where(and(inArray(categories.id, budgetCatIds), eq(categories.userId, userId)));
          
        // Calculate exact spentAmount dynamically from transactions in [startDate, endDate)
        const budgetSpentTxs = await db
          .select({ categoryId: transactions.categoryId, amount: sum(transactions.amount) })
          .from(transactions)
          .where(and(baseFilter, eq(transactions.type, "expense"), inArray(transactions.categoryId, budgetCatIds)))
          .groupBy(transactions.categoryId);
          
        const spentMap = new Map<string, number>();
        budgetSpentTxs.forEach(t => {
          if (t.categoryId) spentMap.set(t.categoryId, Number(t.amount));
        });
        
        const catMap = new Map<string, BudgetPerformanceItem>();
        for (const b of allBudgets) {
          // If category doesn't belong to user, it will be ignored because c is undefined or we can explicitly skip
          const c = bCats.find(cat => cat.id === b.categoryId);
          if (!c) continue; 
          
          if (!catMap.has(b.categoryId)) {
            catMap.set(b.categoryId, {
              categoryId: b.categoryId,
              categoryName: c.name,
              allocatedAmount: 0,
              spentAmount: spentMap.get(b.categoryId) || 0, // exact dynamic spent
              remainingAmount: 0,
              usagePercentage: 0,
              status: "healthy",
            });
          }
          const item = catMap.get(b.categoryId)!;
          item.allocatedAmount += b.allocatedAmount;
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

    // 10. Debts were already built in step 4.

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
      allCatIds.length > 0 ? db.select().from(categories).where(and(inArray(categories.id, allCatIds), eq(categories.userId, userId))) : [],
      allAccIds.length > 0 ? db.select().from(financialAccounts).where(and(inArray(financialAccounts.id, allAccIds), eq(financialAccounts.userId, userId))) : [],
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
