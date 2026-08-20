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

export function calculateNextDueDate(currentDate: Date, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): Date {
  const nextDate = new Date(currentDate);
  if (frequency === 'daily') {
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (frequency === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frequency === 'monthly') {
    const currentMonth = nextDate.getMonth();
    const targetMonth = (currentMonth + 1) % 12;
    nextDate.setMonth(currentMonth + 1);
    
    if (nextDate.getMonth() !== targetMonth) {
      nextDate.setDate(0); 
    }
  } else if (frequency === 'yearly') {
    if (nextDate.getMonth() === 1 && nextDate.getDate() === 29) {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      if (nextDate.getMonth() !== 1) {
        nextDate.setDate(0);
      }
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
  }
  return nextDate;
}
