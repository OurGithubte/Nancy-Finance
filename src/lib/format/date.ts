/**
 * Vietnamese Date Formatting Helpers
 */

export function formatDateVN(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

export function formatMonthYearVN(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return `Tháng ${month}, ${year}`;
}

export function formatTimeVN(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

/**
 * Returns a new Date clamped to the last day of the month if the preferredDay exceeds it.
 * E.g., safeDayOfMonth(2024, 1, 31) -> 2024-02-29
 * Month is 0-indexed (0 = Jan, 1 = Feb, etc.)
 */
export function safeDayOfMonth(year: number, month: number, preferredDay: number): Date {
  const maxDayInMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(preferredDay, maxDayInMonth);
  return new Date(year, month, safeDay);
}

/**
 * Calculates the next due date without drifting the anchor day.
 */
export function calculateNextDueDate(
  currentDate: Date,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  anchorDate: Date = currentDate
): Date {
  const nextDate = new Date(currentDate);

  if (frequency === 'daily') {
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (frequency === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frequency === 'monthly') {
    const nextMonth = nextDate.getMonth() + 1;
    const year = nextDate.getFullYear();
    const anchorDay = anchorDate.getDate();
    return safeDayOfMonth(year, nextMonth, anchorDay);
  } else if (frequency === 'yearly') {
    const nextYear = nextDate.getFullYear() + 1;
    const anchorMonth = anchorDate.getMonth();
    const anchorDay = anchorDate.getDate();
    return safeDayOfMonth(nextYear, anchorMonth, anchorDay);
  }

  return nextDate;
}

export type RecurringTransactionType = {
  id: string;
  type: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date | null;
  nextDueDate: Date;
  note: string | null;
};

/**
 * Projects all occurrences of a recurring transaction within a specified range.
 * Does not mutate DB.
 */
export function projectRecurringOccurrences(
  rt: RecurringTransactionType,
  startDate: Date,
  endDate: Date
): Date[] {
  const occurrences: Date[] = [];
  
  // Start from the current nextDueDate OR startDate if nextDueDate is not set correctly
  let currentDue = new Date(rt.nextDueDate);

  // Safety break to prevent infinite loops (e.g., daily over 100 years)
  let iterations = 0;
  const MAX_ITERATIONS = 500;

  while (currentDue <= endDate && iterations < MAX_ITERATIONS) {
    iterations++;

    if (currentDue >= startDate) {
      if (rt.endDate && currentDue > rt.endDate) {
        break;
      }
      occurrences.push(new Date(currentDue));
    }

    const next = calculateNextDueDate(currentDue, rt.frequency as any, rt.startDate);
    
    // Safety check if date didn't advance
    if (next.getTime() <= currentDue.getTime()) {
      break;
    }
    
    currentDue = next;
  }

  return occurrences;
}