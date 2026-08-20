import { calculateNextDueDate, safeDayOfMonth, projectRecurringOccurrences } from '../src/lib/format/date';
import * as assert from 'assert';

function test() {
  // Test safeDayOfMonth
  assert.strictEqual(safeDayOfMonth(2024, 1, 31).getDate(), 29);
  assert.strictEqual(safeDayOfMonth(2025, 1, 31).getDate(), 28);
  assert.strictEqual(safeDayOfMonth(2024, 3, 31).getDate(), 30); // April

  // Test calculateNextDueDate monthly with drift prevention
  const anchor = new Date(2024, 0, 31); // Jan 31, 2024
  const feb = calculateNextDueDate(anchor, 'monthly', anchor);
  assert.strictEqual(feb.getDate(), 29);
  assert.strictEqual(feb.getMonth(), 1);

  const mar = calculateNextDueDate(feb, 'monthly', anchor);
  assert.strictEqual(mar.getDate(), 31);
  assert.strictEqual(mar.getMonth(), 2);

  const apr = calculateNextDueDate(mar, 'monthly', anchor);
  assert.strictEqual(apr.getDate(), 30);
  assert.strictEqual(apr.getMonth(), 3);

  // Test yearly leap year
  const yearlyAnchor = new Date(2024, 1, 29); // Feb 29, 2024
  const nextYear = calculateNextDueDate(yearlyAnchor, 'yearly', yearlyAnchor);
  assert.strictEqual(nextYear.getDate(), 28);
  assert.strictEqual(nextYear.getMonth(), 1);
  assert.strictEqual(nextYear.getFullYear(), 2025);

  const year3 = calculateNextDueDate(nextYear, 'yearly', yearlyAnchor);
  assert.strictEqual(year3.getDate(), 28);
  assert.strictEqual(year3.getFullYear(), 2026);

  const year5 = calculateNextDueDate(new Date(2027, 1, 28), 'yearly', yearlyAnchor);
  assert.strictEqual(year5.getDate(), 29); // 2028 is leap year again
  assert.strictEqual(year5.getFullYear(), 2028);

  console.log("✅ DATE TESTS PASSED");
}

test();
