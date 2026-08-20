import { db } from "@/db";
import { financialEvents, recurringTransactions, creditCards, loans, savingGoals } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { calculateNextDueDate } from "@/lib/format/date";

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
      let currentDue = new Date(rt.nextDueDate);
      
      // Project forward within the range
      while (currentDue <= endDate) {
        if (currentDue >= startDate) {
          // If the recurring transaction has an end date and we passed it, break
          if (rt.endDate && currentDue > rt.endDate) {
            break;
          }
          events.push({
            id: `recurring_${rt.id}_${currentDue.getTime()}`,
            date: currentDue,
            title: rt.note || (rt.type === 'income' ? 'Thu nhập định kỳ' : 'Chi tiêu định kỳ'),
            amount: rt.amount,
            type: rt.type,
            status: "scheduled",
          });
        }
        
        // Safety break if interval is too small to avoid infinite loop
        const next = calculateNextDueDate(currentDue, rt.frequency);
        if (next.getTime() <= currentDue.getTime()) break;
        currentDue = next;
      }
    }

    // 3. Credit Cards (statement dates & due dates)
    const cards = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.userId, userId));
      
    for (const card of cards) {
      // Find occurrences of statement day and payment due day in the range
      // This is a simplistic projection, assuming it happens every month on that date
      let currentMonth = new Date(startDate);
      currentMonth.setDate(1);
      
      while (currentMonth <= endDate) {
        // Statement date
        const statementDay = new Date(currentMonth);
        statementDay.setDate(card.statementDay);
        if (statementDay >= startDate && statementDay <= endDate) {
          events.push({
            id: `cc_stmt_${card.id}_${statementDay.getTime()}`,
            date: statementDay,
            title: `Ngày sao kê thẻ ${card.name}`,
            amount: null,
            type: "statement",
            status: "upcoming",
          });
        }
        
        // Due date
        const dueDate = new Date(currentMonth);
        dueDate.setDate(card.dueDay);
        // If payment due date is numerically smaller than statement date, it's usually in the NEXT month
        if (card.dueDay < card.statementDay) {
           dueDate.setMonth(dueDate.getMonth() + 1);
        }

        if (dueDate >= startDate && dueDate <= endDate) {
          events.push({
            id: `cc_due_${card.id}_${dueDate.getTime()}`,
            date: dueDate,
            title: `Hạn thanh toán thẻ ${card.name}`,
            amount: null, // Ideally we calculate from unpaid statements, but null for now
            type: "payment_due",
            status: "urgent",
          });
        }
        
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    }

    // Sort by date ascending
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return events;
  }
};
