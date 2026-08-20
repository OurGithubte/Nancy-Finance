import { calculateNextDueDate, safeDayOfMonth, projectRecurringOccurrences } from '../src/lib/format/date';
import * as assert from 'assert';
import { calendarService } from '../src/server/services/calendar';

async function test() {
  console.log("Running Date Logic tests...");
  // Test safeDayOfMonth
  assert.strictEqual(safeDayOfMonth(2024, 1, 31).getDate(), 29);
  assert.strictEqual(safeDayOfMonth(2025, 1, 31).getDate(), 28);
  assert.strictEqual(safeDayOfMonth(2024, 3, 31).getDate(), 30); // April

  // Test calculateNextDueDate monthly with drift prevention
  const anchor = new Date(2026, 0, 31); // Jan 31, 2026
  const feb = calculateNextDueDate(anchor, 'monthly', anchor);
  assert.strictEqual(feb.getDate(), 28);
  assert.strictEqual(feb.getMonth(), 1);

  const mar = calculateNextDueDate(feb, 'monthly', anchor);
  assert.strictEqual(mar.getDate(), 31);
  assert.strictEqual(mar.getMonth(), 2);

  const apr = calculateNextDueDate(mar, 'monthly', anchor);
  assert.strictEqual(apr.getDate(), 30);
  assert.strictEqual(apr.getMonth(), 3);

  // 31/01/2028 -> 29/02/2028 -> 31/03/2028
  const anchor2028 = new Date(2028, 0, 31);
  const feb28 = calculateNextDueDate(anchor2028, 'monthly', anchor2028);
  assert.strictEqual(feb28.getDate(), 29);
  assert.strictEqual(feb28.getMonth(), 1);
  const mar28 = calculateNextDueDate(feb28, 'monthly', anchor2028);
  assert.strictEqual(mar28.getDate(), 31);
  assert.strictEqual(mar28.getMonth(), 2);

  // 30/01 -> Feb last day -> 30/03
  const anchor30 = new Date(2025, 0, 30);
  const feb30 = calculateNextDueDate(anchor30, 'monthly', anchor30);
  assert.strictEqual(feb30.getDate(), 28);
  assert.strictEqual(feb30.getMonth(), 1);
  const mar30 = calculateNextDueDate(feb30, 'monthly', anchor30);
  assert.strictEqual(mar30.getDate(), 30);
  assert.strictEqual(mar30.getMonth(), 2);

  // Test yearly leap year
  // 29/02/2028 -> 28/02/2029 -> 28/02/2030 -> 28/02/2031 -> 29/02/2032
  const yearlyAnchor = new Date(2028, 1, 29); // Feb 29, 2028
  const year29 = calculateNextDueDate(yearlyAnchor, 'yearly', yearlyAnchor);
  assert.strictEqual(year29.getDate(), 28);
  assert.strictEqual(year29.getFullYear(), 2029);

  const year30 = calculateNextDueDate(year29, 'yearly', yearlyAnchor);
  assert.strictEqual(year30.getDate(), 28);
  assert.strictEqual(year30.getFullYear(), 2030);

  const year31 = calculateNextDueDate(year30, 'yearly', yearlyAnchor);
  assert.strictEqual(year31.getDate(), 28);
  assert.strictEqual(year31.getFullYear(), 2031);

  const year32 = calculateNextDueDate(year31, 'yearly', yearlyAnchor);
  assert.strictEqual(year32.getDate(), 29); // 2032 is leap year again
  assert.strictEqual(year32.getFullYear(), 2032);

  // Daily progression
  const dailyAnchor = new Date(2026, 0, 1);
  const nextDay = calculateNextDueDate(dailyAnchor, 'daily', dailyAnchor);
  assert.strictEqual(nextDay.getDate(), 2);
  const day3 = calculateNextDueDate(nextDay, 'daily', dailyAnchor);
  assert.strictEqual(day3.getDate(), 3);
  
  // Weekly progression
  const weeklyAnchor = new Date(2026, 0, 1);
  const nextWeek = calculateNextDueDate(weeklyAnchor, 'weekly', weeklyAnchor);
  assert.strictEqual(nextWeek.getDate(), 8);

  // projectRecurringOccurrences daily
  const dailyRt = { id: 'rt1', frequency: 'daily', startDate: new Date(2026, 0, 1), nextDueDate: new Date(2026, 0, 1) };
  // range is inclusive by convention
  const startD = new Date(2026, 0, 1);
  const endD = new Date(2026, 0, 7);
  const occ = projectRecurringOccurrences(dailyRt as any, startD, endD);
  assert.strictEqual(occ.length, 7); // Jan 1 to Jan 7 inclusive
  
  // Credit Card Calendar Projection Tests
  // We'll mock db queries indirectly or test the logic
  console.log("✅ DATE TESTS PASSED");
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
