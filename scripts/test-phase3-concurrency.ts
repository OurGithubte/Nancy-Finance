import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { eq } from "drizzle-orm";

async function main() {
  const { planningService } = await import("@/server/services/planning");
  const { planningRepository } = await import("@/server/repositories/planning");
  const { db } = await import("@/db");
  const { savingGoals, savingGoalContributions, users } = await import("@/db/schema");

  const TEST_USER_ID = "phase3_test_concurrency_" + Date.now();
  let passed = false;

  try {
    await db.insert(users).values({
      id: TEST_USER_ID,
      name: "Phase 3 Concurrency User",
      email: `test_concurrency_${Date.now()}@example.com`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // SCENARIO A: Concurrent Contributions
    const goalA = await planningService.createSavingGoal({
      userId: TEST_USER_ID,
      name: "Goal A",
      targetAmount: 5000000
    });

    const contribPromises = Array.from({ length: 20 }).map(() => 
      planningService.createContribution({
        userId: TEST_USER_ID,
        savingGoalId: goalA.id,
        amount: 100000,
        type: "contribution"
      })
    );
    await Promise.all(contribPromises);

    let checkA = await planningRepository.getSavingGoalById(goalA.id, TEST_USER_ID);
    let countA = await planningRepository.getContributionsByGoalId(goalA.id, TEST_USER_ID);
    if (checkA.currentAmount !== 2000000) throw new Error(`Scenario A failed: Expected 2,000,000 but got ${checkA.currentAmount}`);
    if (countA.length !== 20) throw new Error(`Scenario A failed: Expected 20 contributions, got ${countA.length}`);
    console.log("Scenario A: PASS");

    // SCENARIO B: Concurrent Withdrawals
    const goalB = await planningService.createSavingGoal({
      userId: TEST_USER_ID,
      name: "Goal B",
      targetAmount: 5000000
    });
    await planningService.createContribution({
      userId: TEST_USER_ID,
      savingGoalId: goalB.id,
      amount: 1000000,
      type: "contribution"
    });

    const withdrawalPromises = Array.from({ length: 10 }).map(() =>
      planningService.createContribution({
        userId: TEST_USER_ID,
        savingGoalId: goalB.id,
        amount: 200000,
        type: "withdrawal"
      }).catch(e => e) // Ignore failures here, we want to check final state
    );
    await Promise.all(withdrawalPromises);

    let checkB = await planningRepository.getSavingGoalById(goalB.id, TEST_USER_ID);
    if (checkB.currentAmount < 0) throw new Error(`Scenario B failed: Negative balance ${checkB.currentAmount}`);
    if (checkB.currentAmount !== 0) throw new Error(`Scenario B failed: Expected 0 balance but got ${checkB.currentAmount}`);
    console.log("Scenario B: PASS");

    // SCENARIO C: Mixed Concurrency
    const goalC = await planningService.createSavingGoal({
      userId: TEST_USER_ID,
      name: "Goal C",
      targetAmount: 5000000
    });

    const mixedPromises = [];
    let expectedAmount = 0;
    
    // 10 contributions of 100,000
    for (let i = 0; i < 10; i++) {
      mixedPromises.push(
        planningService.createContribution({
          userId: TEST_USER_ID,
          savingGoalId: goalC.id,
          amount: 100000,
          type: "contribution"
        }).then(() => { expectedAmount += 100000; }).catch(() => {})
      );
    }
    
    // 10 withdrawals of 150,000 (some will fail)
    for (let i = 0; i < 10; i++) {
      mixedPromises.push(
        planningService.createContribution({
          userId: TEST_USER_ID,
          savingGoalId: goalC.id,
          amount: 150000,
          type: "withdrawal"
        }).then(() => { expectedAmount -= 150000; }).catch(() => {})
      );
    }

    await Promise.allSettled(mixedPromises);

    let checkC = await planningRepository.getSavingGoalById(goalC.id, TEST_USER_ID);
    if (checkC.currentAmount !== expectedAmount) {
      throw new Error(`Scenario C failed: Expected ${expectedAmount} but got ${checkC.currentAmount}`);
    }
    console.log("Scenario C: PASS");

    console.log("PHASE 3 CONCURRENCY TEST: PASS");
    passed = true;
  } catch (e: any) {
    console.error("Test failed:", e);
    console.error("PHASE 3 CONCURRENCY TEST: FAIL");
  } finally {
    console.log("Cleaning up test data...");
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
