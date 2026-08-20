import { db } from "@/db";
import { financialEvents, recurringTransactions, creditCards, creditCardStatements } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { projectRecurringOccurrences, safeDayOfMonth } from "@/lib/format/date";

export type CalendarEvent = {
  id: string;
  date: Date;
  title: string;
  amount: number | null;
  type: "statement" | "payment_due" | "loan_due" | "income" | "expense" | "manual" | "saving_goal";
  status: "upcoming" | "urgent" | "scheduled" | "completed";
};

export const calendarService = {
  async getEventsInRange(userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // 1. Manual Financial Events
    const manualEvents = await db
      .select()
      .from(financialEvents)
      .where(
        and(
          eq(financialEvents.userId, userId),
          gte(financialEvents.eventDate, startDate),
          lte(financialEvents.eventDate, endDate)
        )
      );

    for (const me of manualEvents) {
      events.push({
        id: `manual_${me.id}`,
        date: me.eventDate,
        title: me.title,
        amount: me.amount,
        type: "manual",
        status: me.isCompleted ? "completed" : "upcoming",
      });
    }

    // 2. Recurring Transactions projection
    const recurring = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)));

    for (const rt of recurring) {
      const occurrences = projectRecurringOccurrences(rt as any, startDate, endDate);
      for (const occDate of occurrences) {
        events.push({
          id: `recurring_${rt.id}_${occDate.getTime()}`,
          date: occDate,
          title: rt.note || (rt.type === 'income' ? 'Thu nhập định kỳ' : 'Chi tiêu định kỳ'),
          amount: rt.amount,
          type: rt.type,
          status: "scheduled",
        });
      }
    }

    // 3. Credit Cards (statement dates & due dates)
    const cards = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.userId, userId));

    const statements = await db
      .select({
        creditCardId: creditCardStatements.creditCardId,
        dueDate: creditCardStatements.dueDate,
        totalDue: creditCardStatements.totalDue,
        isPaid: creditCardStatements.isPaid
      })
      .from(creditCardStatements)
      .innerJoin(creditCards, eq(creditCards.id, creditCardStatements.creditCardId))
      .where(
        and(
          eq(creditCards.userId, userId),
          gte(creditCardStatements.dueDate, startDate),
          lte(creditCardStatements.dueDate, endDate)
        )
      );
      
    for (const card of cards) {
      const scanStart = new Date(startDate);
      scanStart.setMonth(scanStart.getMonth() - 1);
      scanStart.setDate(1);
      
      let currentMonth = new Date(scanStart);
      
      while (currentMonth <= endDate) {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const stmtDate = safeDayOfMonth(year, month, card.statementDay);
        
        if (stmtDate >= startDate && stmtDate <= endDate) {
          events.push({
            id: `cc_stmt_${card.id}_${stmtDate.getTime()}`,
            date: stmtDate,
            title: `Ngày sao kê thẻ ${card.name}`,
            amount: null,
            type: "statement",
            status: "upcoming",
          });
        }
        
        let dueMonth = month;
        let dueYear = year;
        
        if (card.dueDay < card.statementDay) {
           dueMonth++;
        }

        const dueDate = safeDayOfMonth(dueYear, dueMonth, card.dueDay);

        if (dueDate >= startDate && dueDate <= endDate) {
          // Find if there's an actual statement for this exact due date
          const matchingStmt = statements.find(
            (s) => s.creditCardId === card.id && s.dueDate.getTime() === dueDate.getTime()
          );

          events.push({
            id: `cc_due_${card.id}_${dueDate.getTime()}`,
            date: dueDate,
            title: `Hạn thanh toán thẻ ${card.name}`,
            amount: matchingStmt ? matchingStmt.totalDue : null,
            type: "payment_due",
            status: matchingStmt && matchingStmt.isPaid === 'paid' ? "completed" : "urgent",
          });
        }
        
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return events;
  }
};