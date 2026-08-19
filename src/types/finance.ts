/**
 * Nancy Finance - Core Domain Types
 * All money amounts are in integer VND (đồng).
 */

export type TransactionType = "income" | "expense" | "transfer";
export type AccountType = "cash" | "bank" | "ewallet" | "savings" | "investment";
export type LoanType = "car" | "home" | "consumer" | "business" | "student";
export type BudgetPeriod = "monthly" | "yearly";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isPremium?: boolean;
}

export interface KpiSummary {
  netWorth: number; // Tài sản ròng (bigint in VND)
  netWorthGrowth: number; // % so với tháng trước (+8.2)
  totalIncome: number; // Thu nhập tháng (VND)
  incomeGrowth: number; // % (+6.5)
  totalExpense: number; // Chi tiêu tháng (VND)
  expenseGrowth: number; // % (+12.4)
  totalDebt: number; // Tổng dư nợ (VND)
  debtGrowth: number; // % (-4.1)
  availableCash: number; // Tiền khả dụng
}

export interface ExpenseCategoryShare {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyCashflowPoint {
  month: string; // T1, T2, ..., T12
  monthLabel: string; // "Tháng 1", etc.
  income: number; // VND
  expense: number; // VND
}

export interface AccountItem {
  id: string;
  name: string;
  type: AccountType;
  balance: number; // VND
  accountNumber?: string;
  icon?: string;
  color?: string;
  isDefault?: boolean;
}

export interface CreditCardItem {
  id: string;
  name: string;
  bankName: string;
  last4: string;
  creditLimit: number; // Hạn mức
  currentBalance: number; // Đã chi / dư nợ hiện tại
  availableLimit: number; // Còn lại
  usedPercentage: number; // %
  statementDay: number; // Ngày sao kê (e.g. 20)
  dueDay: string; // Hạn thanh toán (e.g. "25/05")
  color?: string;
}

export interface LoanItem {
  id: string;
  name: string;
  lenderName: string;
  totalAmount: number; // Tổng tiền vay
  remainingAmount: number; // Còn nợ
  monthlyPayment: number; // Trả hàng tháng
  totalTerms: number; // Tổng số kỳ
  remainingTerms: number; // Còn lại kỳ
  interestRate: number; // % / năm
  paidPercentage: number; // % đã trả
  color?: string;
}

export interface BudgetItem {
  id: string;
  categoryId: string;
  categoryName: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usedPercentage: number;
  color: string;
  isOverBudget: boolean;
}

export interface SavingGoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  progressPercentage: number;
  icon?: string;
  color?: string;
}

export interface TransactionItem {
  id: string;
  title: string;
  type: TransactionType;
  amount: number; // VND
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  accountId: string;
  accountName: string;
  transactionDate: string; // ISO or YYYY-MM-DD
  note?: string;
  status: "completed" | "pending" | "failed";
}

export interface NancyInsight {
  id: string;
  type: "warning" | "tip" | "success" | "info";
  title: string;
  content: string;
  actionText?: string;
  actionUrl?: string;
  createdAt: string;
}
