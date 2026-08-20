import { db } from "@/db";
import { budgets, creditCards, recurringTransactions, financialAccounts, financialEvents, loans, loanSchedules, creditCardStatements } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { projectRecurringOccurrences, safeDayOfMonth } from "@/lib/format/date";

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
      let dueMonth = now.getMonth();
      let dueYear = now.getFullYear();

      if (card.dueDay < now.getDate()) {
        dueMonth++;
      }

      const dueDate = safeDayOfMonth(dueYear, dueMonth, card.dueDay);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      if (daysUntilDue <= 7 && daysUntilDue >= 0 && card.creditLimit > 0) {
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
    const accounts = await db.select().from(financialAccounts).where(eq(financialAccounts.userId, userId));
    const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
    
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    let projectedExpense = 0;
    let projectedIncome = 0;

    // 3a. Recurring
    const recurring = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)));
      
    for (const rt of recurring) {
      const occurrences = projectRecurringOccurrences(rt as any, now, sevenDaysFromNow);
      for (let i = 0; i < occurrences.length; i++) {
        if (rt.type === 'expense') {
          projectedExpense += rt.amount;
        } else if (rt.type === 'income') {
          projectedIncome += rt.amount;
        }
      }
    }

    // 3b. Financial Events (Rule: We ignore loan_due and cc_due here to prevent double counting, 
    // because loanSchedules and creditCardStatements are the authoritative sources)
    const upcomingEvents = await db
      .select()
      .from(financialEvents)
      .where(
        and(
          eq(financialEvents.userId, userId),
          eq(financialEvents.isCompleted, false),
          gte(financialEvents.eventDate, now),
          lte(financialEvents.eventDate, sevenDaysFromNow)
        )
      );

    for (const ev of upcomingEvents) {
      if (ev.amount) {
        if (ev.eventType === "salary") {
          projectedIncome += ev.amount;
        } else if (ev.eventType === "bill_due") {
          projectedExpense += ev.amount;
        }
      }
    }

    // 3c. Unpaid Loan Schedules
    const unpaidSchedules = await db
      .select({ totalDue: loanSchedules.totalDue })
      .from(loanSchedules)
      .innerJoin(loans, eq(loans.id, loanSchedules.loanId))
      .where(
        and(
          eq(loans.userId, userId),
          eq(loanSchedules.isPaid, false),
          gte(loanSchedules.dueDate, now),
          lte(loanSchedules.dueDate, sevenDaysFromNow)
        )
      );
      
    for (const s of unpaidSchedules) {
      projectedExpense += s.totalDue;
    }

    // 3d. Unpaid Credit Card Statements
    const unpaidStatements = await db
      .select({ totalDue: creditCardStatements.totalDue })
      .from(creditCardStatements)
      .innerJoin(creditCards, eq(creditCards.id, creditCardStatements.creditCardId))
      .where(
        and(
          eq(creditCards.userId, userId),
          sql`${creditCardStatements.isPaid} != 'paid'`,
          gte(creditCardStatements.dueDate, now),
          lte(creditCardStatements.dueDate, sevenDaysFromNow)
        )
      );

    for (const stmt of unpaidStatements) {
      projectedExpense += stmt.totalDue;
    }

    const projectedAvailable = totalBalance + projectedIncome - projectedExpense;

    if (projectedAvailable < 0) {
      insights.push({
        id: "cashflow_risk",
        severity: "critical",
        title: "Cảnh báo dòng tiền",
        description: "Các khoản chi dự kiến trong 7 ngày tới vượt quá số dư hiện tại kèm thu nhập dự kiến.",
        amount: Math.abs(projectedAvailable),
      });
    }

    // 4. Positive insight: no warnings, good balance
    if (insights.length === 0) {
      insights.push({
        id: "positive_finance",
        severity: "positive",
        title: "Tình hình tài chính ổn định",
        description: "Hiện chưa phát hiện cảnh báo ngân sách hoặc dòng tiền ngắn hạn.",
      });
    }

    return insights;
  }
};