import { db } from "@/db";
import {
  budgets,
  creditCards,
  recurringTransactions,
  financialAccounts,
  financialEvents,
  loans,
  loanSchedules,
  creditCardStatements,
  transactions,
} from "@/db/schema";
import { eq, and, gte, lt, lte, sql } from "drizzle-orm";
import { projectRecurringOccurrences, RecurringTransactionType } from "@/lib/format/date";
import { NetWorthService } from "./net-worth";
import { ForecastService, type CashflowForecastResult } from "./forecast";
import { getReportPeriodDates, getVNDateParts } from "./reports";

export type SmartInsight = {
  id: string;
  severity: "info" | "positive" | "warning" | "critical";
  title: string;
  description: string;
  amount?: number;
  actionLabel?: string;
  actionHref?: string;
};

type NetWorthHistory = Awaited<ReturnType<typeof NetWorthService.getNetWorthHistory>>;

export type SmartInsightContext = {
  /** Reuse work already started by the dashboard instead of querying the same history twice. */
  netWorthHistory?: Promise<NetWorthHistory> | NetWorthHistory;
  /** Reuse the dashboard 30-day forecast instead of recomputing it inside insights. */
  forecast30?: Promise<CashflowForecastResult> | CashflowForecastResult;
};

export const insightsService = {
  async getSmartInsights(userId: string, context: SmartInsightContext = {}): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    const now = new Date();
    const { y: currentYear, m: currentMonth } = getVNDateParts(now);
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const { startDate: monthStart, endDate: monthEnd } = getReportPeriodDates("this_month");

    // These reads are independent. Doing them concurrently removes the large serverless/DB
    // waterfall that previously made Smart Insights one of the slowest dashboard dependencies.
    const [
      activeBudgets,
      unpaidStatements,
      accounts,
      recurring,
      upcomingEvents,
      unpaidSchedules,
      netWorthHistory,
      monthTxs,
    ] = await Promise.all([
      db
        .select()
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.month, currentMonth), eq(budgets.year, currentYear))),
      db
        .select({
          id: creditCardStatements.id,
          cardId: creditCards.id,
          cardName: creditCards.name,
          totalDue: creditCardStatements.totalDue,
          dueDate: creditCardStatements.dueDate,
        })
        .from(creditCardStatements)
        .innerJoin(creditCards, eq(creditCards.id, creditCardStatements.creditCardId))
        .where(
          and(
            eq(creditCards.userId, userId),
            sql`${creditCardStatements.isPaid} != 'paid'`,
            gte(creditCardStatements.dueDate, now),
            lte(creditCardStatements.dueDate, sevenDaysFromNow)
          )
        ),
      db
        .select({ balance: financialAccounts.balance })
        .from(financialAccounts)
        .where(eq(financialAccounts.userId, userId)),
      db
        .select()
        .from(recurringTransactions)
        .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true))),
      db
        .select()
        .from(financialEvents)
        .where(
          and(
            eq(financialEvents.userId, userId),
            eq(financialEvents.isCompleted, false),
            gte(financialEvents.eventDate, now),
            lte(financialEvents.eventDate, sevenDaysFromNow)
          )
        ),
      db
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
        ),
      context.netWorthHistory ?? NetWorthService.getNetWorthHistory(userId, 6),
      db
        .select({ type: transactions.type, amount: transactions.amount })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.status, "completed"),
            gte(transactions.transactionDate, monthStart),
            lt(transactions.transactionDate, monthEnd)
          )
        ),
    ]);

    for (const b of activeBudgets) {
      if (b.allocatedAmount <= 0) continue;
      const ratio = b.spentAmount / b.allocatedAmount;
      if (ratio > 1) {
        insights.push({
          id: `budget_crit_${b.id}`,
          severity: "critical",
          title: "Vượt ngân sách",
          description: "Bạn đã chi tiêu vượt quá ngân sách đặt ra cho tháng này.",
          amount: b.spentAmount - b.allocatedAmount,
          actionLabel: "Xem ngân sách",
          actionHref: "/budgets",
        });
      } else if (ratio >= 0.8) {
        insights.push({
          id: `budget_warn_${b.id}`,
          severity: "warning",
          title: "Sắp hết ngân sách",
          description: `Đã sử dụng ${Math.round(ratio * 100)}% ngân sách tháng này.`,
          amount: b.allocatedAmount - b.spentAmount,
          actionLabel: "Xem ngân sách",
          actionHref: "/budgets",
        });
      }
    }

    for (const stmt of unpaidStatements) {
      if (stmt.totalDue <= 0) continue;
      const daysUntilDue = Math.ceil((stmt.dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      insights.push({
        id: `cc_due_${stmt.id}`,
        severity: "warning",
        title: `Sắp tới hạn thẻ ${stmt.cardName}`,
        description: `Còn ${daysUntilDue} ngày nữa đến hạn thanh toán ${stmt.totalDue.toLocaleString("vi-VN")} ₫.`,
        amount: stmt.totalDue,
        actionLabel: "Xem thẻ tín dụng",
        actionHref: "/credit-cards",
      });
    }

    const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
    let projectedExpense = 0;
    let projectedIncome = 0;

    for (const rt of recurring) {
      const occurrences = projectRecurringOccurrences(rt as RecurringTransactionType, now, sevenDaysFromNow);
      for (const _occurrence of occurrences) {
        if (rt.type === "expense") projectedExpense += rt.amount;
        else if (rt.type === "income") projectedIncome += rt.amount;
      }
    }

    for (const ev of upcomingEvents) {
      if (!ev.amount) continue;
      if (ev.eventType === "salary") projectedIncome += ev.amount;
      else if (ev.eventType === "bill_due") projectedExpense += ev.amount;
    }

    for (const schedule of unpaidSchedules) projectedExpense += schedule.totalDue;
    for (const stmt of unpaidStatements) projectedExpense += stmt.totalDue;

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

    if (netWorthHistory.hasSufficientHistory) {
      const points = netWorthHistory.points;
      const latest = points[points.length - 1];
      if (latest.assets > 0 && latest.debt > latest.assets) {
        insights.push({
          id: "debt_exceeds_assets",
          severity: "critical",
          title: "Dư nợ vượt tài sản",
          description: "Tổng dư nợ hiện tại đang lớn hơn tổng tài sản của bạn. Ưu tiên trả bớt nợ trước khi mở rộng chi tiêu.",
          amount: latest.debt - latest.assets,
          actionLabel: "Xem khoản vay & thẻ tín dụng",
          actionHref: "/loans",
        });
      }

      const last3 = points.slice(-3);
      if (last3.length === 3) {
        const isDeclining = last3[0].netWorth > last3[1].netWorth && last3[1].netWorth > last3[2].netWorth;
        const isGrowing = last3[0].netWorth < last3[1].netWorth && last3[1].netWorth < last3[2].netWorth;
        if (isDeclining) {
          insights.push({
            id: "networth_declining",
            severity: "warning",
            title: "Tài sản ròng đang giảm",
            description: `Tài sản ròng đã giảm liên tục trong ${last3.length} tháng gần đây, từ ${last3[0].netWorth.toLocaleString("vi-VN")} ₫ xuống ${last3[2].netWorth.toLocaleString("vi-VN")} ₫.`,
            actionLabel: "Xem báo cáo",
            actionHref: "/reports",
          });
        } else if (isGrowing) {
          insights.push({
            id: "networth_growing",
            severity: "positive",
            title: "Tài sản ròng tăng trưởng ổn định",
            description: `Tài sản ròng đã tăng liên tục trong ${last3.length} tháng gần đây. Tiếp tục duy trì thói quen tài chính hiện tại.`,
          });
        }
      }
    }

    const hasNearTermCashflowAlert = insights.some((i) => i.id === "cashflow_risk");
    if (!hasNearTermCashflowAlert) {
      const forecast30 = await (context.forecast30 ?? ForecastService.getForecast(userId, 30));
      if (!forecast30.insufficientData && forecast30.confidence !== "low" && forecast30.projectedNetCashflow < 0) {
        insights.push({
          id: "forecast_negative_30d",
          severity: "warning",
          title: "Dự báo dòng tiền âm trong 30 ngày tới",
          description: "Dựa trên giao dịch định kỳ và lịch sử chi tiêu, dòng tiền ròng dự kiến sẽ âm trong 30 ngày tới.",
          amount: Math.abs(forecast30.projectedNetCashflow),
          actionLabel: "Xem dự báo chi tiết",
          actionHref: "/reports",
        });
      }
    }

    let monthIncome = 0;
    let monthExpense = 0;
    for (const tx of monthTxs) {
      if (tx.type === "income") monthIncome += tx.amount;
      else if (tx.type === "expense") monthExpense += tx.amount;
    }
    if (monthIncome > 0) {
      const savingsRate = ((monthIncome - monthExpense) / monthIncome) * 100;
      if (savingsRate < 10) {
        insights.push({
          id: "savings_rate_low",
          severity: "warning",
          title: "Tỷ lệ tiết kiệm thấp",
          description: `Tỷ lệ tiết kiệm tháng này chỉ đạt ${Math.round(savingsRate)}%, thấp hơn mức khuyến nghị tối thiểu 10-20%.`,
          actionLabel: "Xem ngân sách",
          actionHref: "/budgets",
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        id: "positive_finance",
        severity: "positive",
        title: "Tình hình tài chính ổn định",
        description: "Hiện chưa phát hiện cảnh báo ngân sách hoặc dòng tiền ngắn hạn.",
      });
    }

    return insights;
  },
};
