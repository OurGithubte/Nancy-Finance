import { db } from '../src/server/db';
import { user } from '../src/server/db/schema/auth';

async function run() {
  try {
    const allUsers = await db.select().from(user);
    console.log("Users:", allUsers.map(u => ({ email: u.email, name: u.name, id: u.id })));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
