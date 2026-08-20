import { planningService } from "@/server/services/planning";
import { planningRepository } from "@/server/repositories/planning";
import { db } from "@/db";
import { savingGoals, savingGoalContributions, users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    // 1. Get or create a user for testing
    let testUser = await db.select().from(users).limit(1).then(res => res[0]);
    if (!testUser) {
      testUser = await db.insert(users).values({
        id: "test-user-" + Date.now(),
        name: "Test User",
        email: "test@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning().then(res => res[0]);
    }
    const userId = testUser.id;
    console.log("Using user:", userId);

    // Clean up old test data
    await db.delete(savingGoals).where(eq(savingGoals.userId, userId));

    // 1. Create saving goal 10.000.000
    const goal = await planningService.createSavingGoal({
      userId,
      name: "Mua xe máy",
      targetAmount: 10000000
    });
    console.log("Created goal:", goal.name, "target:", goal.targetAmount);

    // 2. Góp 1.000.000
    await planningService.createContribution({
      userId,
      savingGoalId: goal.id,
      amount: 1000000,
      type: "contribution",
      note: "Góp lần 1"
    });
    console.log("Contributed 1.000.000");

    // 3. Check currentAmount = 1.000.000
    let goalCheck = await planningRepository.getSavingGoalById(goal.id, userId);
    console.log("Current amount after contrib 1:", goalCheck.currentAmount);
    if (goalCheck.currentAmount !== 1000000) throw new Error("Mismatch");

    // 4. Góp thêm 500.000
    await planningService.createContribution({
      userId,
      savingGoalId: goal.id,
      amount: 500000,
      type: "contribution"
    });
    console.log("Contributed 500.000");

    // Check currentAmount = 1.500.000
    goalCheck = await planningRepository.getSavingGoalById(goal.id, userId);
    console.log("Current amount after contrib 2:", goalCheck.currentAmount);
    if (goalCheck.currentAmount !== 1500000) throw new Error("Mismatch");

    // 5. Rút 300.000
    await planningService.createContribution({
      userId,
      savingGoalId: goal.id,
      amount: 300000,
      type: "withdrawal"
    });
    console.log("Withdrew 300.000");

    // Check currentAmount = 1.200.000
    goalCheck = await planningRepository.getSavingGoalById(goal.id, userId);
    console.log("Current amount after withdrawal:", goalCheck.currentAmount);
    if (goalCheck.currentAmount !== 1200000) throw new Error("Mismatch");

    // 6. Thử rút 2.000.000 -> reject
    try {
      await planningService.createContribution({
        userId,
        savingGoalId: goal.id,
        amount: 2000000,
        type: "withdrawal"
      });
      throw new Error("Should have failed but didn't");
    } catch (e: any) {
      console.log("Successfully rejected over-withdrawal:", e.message);
    }

    // 7. Check contribution records in DB
    const contribs = await planningRepository.getContributionsByGoalId(goal.id, userId);
    console.log("Contributions in DB:");
    contribs.forEach(c => {
      console.log(`- ${c.type}: ${c.amount}`);
    });

    if (contribs.length !== 3) {
      throw new Error(`Expected 3 contributions, found ${contribs.length}`);
    }
    console.log("ALL TESTS PASSED!");
  } catch (e: any) {
    console.error("Test failed:", e);
  }
}
main();
