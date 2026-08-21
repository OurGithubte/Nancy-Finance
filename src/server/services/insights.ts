import { db } from "@/db";
import { budgets, creditCards, recurringTransactions, financialAccounts, financialEvents, loans, loanSchedules, creditCardStatements, transactions } from "@/db/schema";
import { eq, and, gte, lt, lte, sql } from "drizzle-orm";
import { projectRecurringOccurrences, RecurringTransactionType } from "@/lib/format/date";
import { NetWorthService } from "./net-worth";
import { ForecastService } from "./forecast";
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

export const insightsService = {
  async getSmartInsights(userId: string): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    const now = new Date();
    
    // 1. Budget warnings
    // Dùng getVNDateParts() (Asia/Ho_Chi_Minh) thay vì now.getMonth()/getFullYear() theo
    // server local time — Vercel chạy UTC, nên gần cuối/đầu tháng theo giờ VN,
    // now.getMonth() có thể trả về tháng khác với tháng thực tế ở VN, khiến budget của
    // đúng tháng hiện tại (VN) bị bỏ sót hoặc lấy nhầm ngân sách tháng kế bên.
    const { y: currentYear, m: currentMonth } = getVNDateParts(now);
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

    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // 2. Credit Card dues (<= 7 days) & Cashflow Unpaid Statements
    const unpaidStatements = await db
      .select({ 
        id: creditCardStatements.id,
        cardId: creditCards.id,
        cardName: creditCards.name,
        totalDue: creditCardStatements.totalDue,
        dueDate: creditCardStatements.dueDate
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
      );

    for (const stmt of unpaidStatements) {
      if (stmt.totalDue > 0) {
        const daysUntilDue = Math.ceil((stmt.dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        insights.push({
          id: `cc_due_${stmt.id}`,
          severity: "warning",
          title: `Sắp tới hạn thẻ ${stmt.cardName}`,
          description: `Còn ${daysUntilDue} ngày nữa đến hạn thanh toán ${stmt.totalDue.toLocaleString("vi-VN")} ₫.`,
          amount: stmt.totalDue,
          actionLabel: "Xem thẻ tín dụng",
          actionHref: "/credit-cards"
        });
      }
    }

    // 3. Cash-flow risk (predict next 7 days based on recurring + events, compare to available balance)
    const accounts = await db.select().from(financialAccounts).where(eq(financialAccounts.userId, userId));
    const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
    
    let projectedExpense = 0;
    let projectedIncome = 0;

    // 3a. Recurring
    const recurring = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)));
      
    for (const rt of recurring) {
      const occurrences = projectRecurringOccurrences(rt as RecurringTransactionType, now, sevenDaysFromNow);
      for (let i = 0; i < occurrences.length; i++) {
        if (rt.type === 'expense') {
          projectedExpense += rt.amount;
        } else if (rt.type === 'income') {
          projectedIncome += rt.amount;
        }
      }
    }

    // 3b. Financial Events
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

    // Add statements to projectedExpense
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

    // 4. Net worth trend (last 6 months) — only fires with enough history to be meaningful
    const netWorthHistory = await NetWorthService.getNetWorthHistory(userId, 6);
    if (netWorthHistory.hasSufficientHistory) {
      const points = netWorthHistory.points;
      const latest = points[points.length - 1];

      // Debt exceeds assets: structurally risky regardless of trend direction
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

      // Trend over the last 3 available points (declining/increasing consistently)
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

    // 5. Forward-looking cashflow risk from the deterministic 30-day forecast.
    // Uses a distinct id from the 7-day "cashflow_risk" check above to avoid
    // presenting the same underlying risk as two unrelated alerts when both fire;
    // if the near-term (7-day) alert already fired, we don't add the 30-day one too.
    const hasNearTermCashflowAlert = insights.some((i) => i.id === "cashflow_risk");
    if (!hasNearTermCashflowAlert) {
      const forecast30 = await ForecastService.getForecast(userId, 30);
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

    // 6. Savings rate this month (flow metric — transfers already excluded by type)
    const { startDate: monthStart, endDate: monthEnd } = getReportPeriodDates("this_month");
    const monthTxs = await db
      .select({ type: transactions.type, amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "completed"),
          gte(transactions.transactionDate, monthStart),
          // getReportPeriodDates() trả về [startDate, endDate) — endDate là EXCLUSIVE
          // (00:00 ngày 1 tháng sau). Dùng lte(monthEnd) sẽ tính nhầm giao dịch xảy ra
          // đúng lúc monthEnd (00:00 ngày 1 tháng sau) vào tháng hiện tại. Phải dùng lt().
          lt(transactions.transactionDate, monthEnd)
        )
      );
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

    // 7. Positive insight: no warnings, good balance
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