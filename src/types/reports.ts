export type ReportPeriodType = "this_month" | "last_month" | "last_3_months" | "last_6_months" | "this_year" | "custom";

export interface ReportPeriod {
  type: ReportPeriodType;
  startDate: Date; // inclusive
  endDate: Date; // exclusive
}

export interface KpiSummary {
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  savingsRate: number | null; // null if income is 0
  totalAssets: number;
  totalDebt: number;
}

export interface PeriodComparison {
  incomeChange: number | null; // null if previous was 0 and it's undefined
  expenseChange: number | null;
  netCashflowChange: number | null;
  savingsRateChange: number | null; // percentage points
  hasPreviousData: boolean;
}

export interface ExpenseCategoryShare {
  id: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyCashflowPoint {
  month: string; // e.g. "T01" or "01/2026"
  income: number;
  expense: number;
  netCashflow: number;
}

export interface BudgetPerformanceItem {
  categoryId: string;
  categoryName: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  status: "healthy" | "warning" | "over_budget";
}

export interface SavingGoalProgressItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  targetDate: Date | null;
  status: "in_progress" | "achieved" | "cancelled";
}

export interface DebtSummaryItem {
  id: string;
  type: "loan" | "credit_card";
  name: string;
  lenderOrBank: string;
  originalAmountOrLimit: number;
  remainingOrCurrentBalance: number;
  monthlyPaymentOrMinDue: number;
  paidPercentage?: number; // only for loans
  dueDate: Date | null;
  status: string;
}

export interface TopExpenseItem {
  id: string;
  date: Date;
  description: string;
  categoryName: string;
  accountName: string;
  amount: number;
}

export interface FinancialReport {
  period: ReportPeriod;
  summary: KpiSummary;
  comparison: PeriodComparison;
  expenseCategories: ExpenseCategoryShare[];
  cashflowTrend: MonthlyCashflowPoint[];
  budgetPerformance: BudgetPerformanceItem[];
  savingGoals: SavingGoalProgressItem[];
  debts: DebtSummaryItem[];
  topExpenses: TopExpenseItem[];
}
