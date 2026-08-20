import { db } from "../src/db";
import { users, creditCards, creditCardStatements } from "../src/db/schema";
import { insightsService } from "../src/server/services/insights";
import * as assert from "assert";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Setting up Credit Card Insights tests...");

  const [userA] = await db.select().from(users).limit(1);
  if (!userA) throw new Error("No user found");

  const [userB] = await db.insert(users).values({
    id: crypto.randomUUID(),
    name: "User B",
    email: "userb2@example.com",
  }).returning();

  const cleanupIds: string[] = [userB.id];

  try {
    const now = new Date();

    // CC1 for User A
    const [cc1] = await db.insert(creditCards).values({
      id: crypto.randomUUID(),
      userId: userA.id,
      name: "CC1",
      bankName: "Bank",
      last4Digits: "1111",
      creditLimit: 20000000,
      statementDay: 1,
      dueDay: 15,
    }).returning();
    cleanupIds.push(cc1.id);

    // CC2 for User B
    const [ccB] = await db.insert(creditCards).values({
      id: crypto.randomUUID(),
      userId: userB.id,
      name: "CC2",
      bankName: "Bank",
      last4Digits: "2222",
      creditLimit: 20000000,
      statementDay: 1,
      dueDay: 15,
    }).returning();
    cleanupIds.push(ccB.id);

    // Case 1: Card no statement -> No warning
    let insights = await insightsService.getSmartInsights(userA.id);
    assert.strictEqual(insights.filter(i => i.id === `cc_due_undefined` || i.id.includes(cc1.id)).length, 0);

    // Case 2: Paid statement within 3 days -> No warning
    const dueIn3Days = new Date(now);
    dueIn3Days.setDate(dueIn3Days.getDate() + 3);

    const [stmtPaid] = await db.insert(creditCardStatements).values({
      id: crypto.randomUUID(),
      creditCardId: cc1.id,
      statementDate: new Date(),
      dueDate: dueIn3Days,
      totalDue: 2000000,
      minPaymentDue: 200000,
      isPaid: "paid",
    }).returning();
    
    insights = await insightsService.getSmartInsights(userA.id);
    assert.strictEqual(insights.filter(i => i.id === `cc_due_${stmtPaid.id}`).length, 0);

    // Case 3: Unpaid statement within 3 days -> Warning exists with amount
    const [stmtUnpaid] = await db.insert(creditCardStatements).values({
      id: crypto.randomUUID(),
      creditCardId: cc1.id,
      statementDate: new Date(),
      dueDate: dueIn3Days,
      totalDue: 2500000,
      minPaymentDue: 200000,
      isPaid: "unpaid",
    }).returning();

    insights = await insightsService.getSmartInsights(userA.id);
    const dueInsight = insights.find(i => i.id === `cc_due_${stmtUnpaid.id}`);
    assert.ok(dueInsight, "Expected warning for unpaid statement within 3 days");
    assert.strictEqual(dueInsight?.amount, 2500000);

    // Case 4: Unpaid statement > 7 days -> No near-due warning
    const dueIn10Days = new Date(now);
    dueIn10Days.setDate(dueIn10Days.getDate() + 10);

    const [stmtFar] = await db.insert(creditCardStatements).values({
      id: crypto.randomUUID(),
      creditCardId: cc1.id,
      statementDate: new Date(),
      dueDate: dueIn10Days,
      totalDue: 5000000,
      minPaymentDue: 500000,
      isPaid: "unpaid",
    }).returning();

    insights = await insightsService.getSmartInsights(userA.id);
    assert.strictEqual(insights.filter(i => i.id === `cc_due_${stmtFar.id}`).length, 0);

    // Case 5: Other user's unpaid statement -> No warning for current user
    const [stmtUserB] = await db.insert(creditCardStatements).values({
      id: crypto.randomUUID(),
      creditCardId: ccB.id,
      statementDate: new Date(),
      dueDate: dueIn3Days,
      totalDue: 9000000,
      minPaymentDue: 900000,
      isPaid: "unpaid",
    }).returning();

    insights = await insightsService.getSmartInsights(userA.id);
    assert.strictEqual(insights.filter(i => i.id === `cc_due_${stmtUserB.id}`).length, 0);

    console.log("✅ INSIGHTS TESTS PASSED");

  } finally {
    console.log("Cleaning up...");
    for (const id of cleanupIds) {
      await db.delete(users).where(eq(users.id, id));
      await db.delete(creditCards).where(eq(creditCards.id, id));
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
