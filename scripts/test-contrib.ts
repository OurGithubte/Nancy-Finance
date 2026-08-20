import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { eq } from "drizzle-orm";

async function main() {
  const { planningService } = await import("@/server/services/planning");
  const { planningRepository } = await import("@/server/repositories/planning");
  const { db } = await import("@/db");
  const { savingGoals, savingGoalContributions, users } = await import("@/db/schema");

  const TEST_USER_ID = "runtime_test_contrib_" + Date.now();
  let passed = false;

  try {
    // Setup dedicated test user
    await db.insert(users).values({
      id: TEST_USER_ID,
      name: "Phase 3 Test User",
      email: `test_contrib_${Date.now()}@example.com`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("Using dedicated test user:", TEST_USER_ID);

    // 1. Create saving goal 10.000.000
    const goal = await planningService.createSavingGoal({
      userId: TEST_USER_ID,
      name: "Mua xe máy Test",
      targetAmount: 10000000
    });
    console.log("Created goal:", goal.name, "target:", goal.targetAmount);

    // 2. Contribute 1.000.000
    await planningService.createContribution({
      userId: TEST_USER_ID,
      savingGoalId: goal.id,
      amount: 1000000,
      type: "contribution",
      note: "Góp lần 1"
    });
    
    // 3. Verify currentAmount
    let goalCheck = await planningRepository.getSavingGoalById(goal.id, TEST_USER_ID);
    if (goalCheck.currentAmount !== 1000000) throw new Error("Mismatch after contrib 1");

    // 4. Contribute 500.000
    await planningService.createContribution({
      userId: TEST_USER_ID,
      savingGoalId: goal.id,
      amount: 500000,
      type: "contribution"
    });

    // Verify currentAmount
    goalCheck = await planningRepository.getSavingGoalById(goal.id, TEST_USER_ID);
    if (goalCheck.currentAmount !== 1500000) throw new Error("Mismatch after contrib 2");

    // 5. Withdraw 300.000
    await planningService.createContribution({
      userId: TEST_USER_ID,
      savingGoalId: goal.id,
      amount: 300000,
      type: "withdrawal"
    });

    // Verify currentAmount
    goalCheck = await planningRepository.getSavingGoalById(goal.id, TEST_USER_ID);
    if (goalCheck.currentAmount !== 1200000) throw new Error("Mismatch after withdrawal");

    // 6. Over-withdrawal test (2.000.000)
    let rejected = false;
    try {
      await planningService.createContribution({
        userId: TEST_USER_ID,
        savingGoalId: goal.id,
        amount: 2000000,
        type: "withdrawal"
      });
    } catch (e: any) {
      rejected = true;
    }

    if (!rejected) {
      throw new Error("Expected over-withdrawal to be rejected");
    }

    // Verify that currentAmount didn't change and no extra contribution was added
    goalCheck = await planningRepository.getSavingGoalById(goal.id, TEST_USER_ID);
    if (goalCheck.currentAmount !== 1200000) throw new Error("Over-withdrawal changed currentAmount!");

    const contribs = await planningRepository.getContributionsByGoalId(goal.id, TEST_USER_ID);
    if (contribs.length !== 3) {
      throw new Error(`Expected exactly 3 contributions, found ${contribs.length} after rejected withdrawal`);
    }

    console.log("PHASE 3 RUNTIME TEST: PASS");
    passed = true;
  } catch (e: any) {
    console.error("Test failed:", e);
    console.error("PHASE 3 RUNTIME TEST: FAIL");
  } finally {
    console.log("Cleaning up test data...");
    // Cleanup in order
    await db.delete(savingGoalContributions).where(eq(savingGoalContributions.userId, TEST_USER_ID));
    await db.delete(savingGoals).where(eq(savingGoals.userId, TEST_USER_ID));
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
    
    if (!passed) {
      setTimeout(() => process.exit(1), 100);
    } else {
      setTimeout(() => process.exit(0), 100);
    }
  }
}

process.on('uncaughtException', (err) => {
  if (err.name === 'ErrorEvent') return; // Ignore Neon WS drop error
  console.error(err);
});

main();
