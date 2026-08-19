import { db } from "../src/db/index.js";
import { users } from "../src/db/schema/index.js";
import { like, or } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Starting test users cleanup...");

  try {
    const deletedUsers = await db
      .delete(users)
      .where(
        or(
          like(users.email, "tester_%@nancyfinance.vn"),
          like(users.email, "auth_test_v2_%@nancyfinance.vn")
        )
      )
      .returning({ id: users.id, email: users.email });

    console.log(`Deleted ${deletedUsers.length} test users:`);
    for (const user of deletedUsers) {
      console.log(`- ${user.email} (${user.id})`);
    }

    console.log("Cleanup completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

main();
