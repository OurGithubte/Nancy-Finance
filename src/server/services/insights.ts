import { db } from "@/db";
import { budgets, creditCards, savingGoals, recurringTransactions, financialAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type SmartInsight = {
  id: string;
  severity: "info" | "positive" | "warning" | "critical";
  title: string;
  description: string;
  amount?: number;
  actionLabel?: string;
  actionHref?: string;
};

export const insightsService = {
  async getSmartInsights(userId: string): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    const now = new Date();
    
    // 1. Budget warnings
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const activeBudgets = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.month, currentMonth), eq(budgets.year, currentYear)));

    for (const b of activeBudgets) {
      if (b.allocatedAmount > 0) {
        const ratio = b.spentAmount / b.allocatedAmount;
        if (ratio > 1) {
          insights.push({
            id: `budget_crit_${b.id}`,
            severity: "critical",
            title: "Vượt ngân sách",
            description: "Bạn đã chi tiêu vượt quá ngân sách đặt ra cho tháng này.",
            amount: b.spentAmount - b.allocatedAmount,
            actionLabel: "Xem ngân sách",
            actionHref: "/budgets"
          });
        } else if (ratio >= 0.8) {
          insights.push({
            id: `budget_warn_${b.id}`,
            severity: "warning",
            title: "Sắp hết ngân sách",
            description: `Đã sử dụng ${Math.round(ratio * 100)}% ngân sách tháng này.`,
            amount: b.allocatedAmount - b.spentAmount,
            actionLabel: "Xem ngân sách",
            actionHref: "/budgets"
          });
        }
      }
    }

    // 2. Credit Card dues (<= 7 days)
    const cards = await db.select().from(creditCards).where(eq(creditCards.userId, userId));
    for (const card of cards) {
      // Find next due date
      const dueDate = new Date(now);
      dueDate.setDate(card.dueDay);
      if (card.dueDay < now.getDate()) {
        dueDate.setMonth(dueDate.getMonth() + 1); // next month
      }
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      
      if (daysUntilDue <= 7 && daysUntilDue >= 0 && card.creditLimit > 0) {
        // Warning if due soon (ideally we check if there's a statement balance, but let's assume it requires attention)
        insights.push({
          id: `cc_due_${card.id}`,
          severity: "warning",
          title: `Sắp tới hạn thẻ ${card.name}`,
          description: `Còn ${daysUntilDue} ngày nữa là tới hạn thanh toán thẻ.`,
          actionLabel: "Xem thẻ tín dụng",
          actionHref: "/credit-cards"
        });
      }
    }

    // 3. Cash-flow risk (predict next 7 days based on recurring + events, compare to available balance)
    // Simplify: sum of next 7 days recurring expenses vs total balance
    const accounts = await db.select().from(financialAccounts).where(eq(financialAccounts.userId, userId));
    const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
    
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const recurring = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)));
      
    let projectedExpense = 0;
    for (const rt of recurring) {
      if (rt.type === 'expense' && rt.nextDueDate <= sevenDaysFromNow && rt.nextDueDate >= now) {
        projectedExpense += rt.amount;
      }
    }
    
    if (projectedExpense > totalBalance) {
      insights.push({
        id: "cashflow_risk",
        severity: "critical",
        title: "Cảnh báo dòng tiền",
        description: "Các khoản chi dự kiến trong 7 ngày tới vượt quá tổng số dư hiện tại.",
        amount: projectedExpense - totalBalance,
      });
    }

    // 4. Positive insight: no warnings, good balance
    if (insights.length === 0) {
      insights.push({
        id: "positive_finance",
        severity: "positive",
        title: "Tình hình tài chính tốt",
        description: "Bạn đang quản lý tài chính rất tốt, không có khoản nợ hay ngân sách nào đáng lo ngại lúc này.",
      });
    }

    return insights;
  }
};
