const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../src/db/migrations/0004_mysterious_king_cobra.sql');
const dest = path.join(__dirname, '../src/db/migrations/0005_repair.sql');
const journalPath = path.join(__dirname, '../src/db/migrations/meta/_journal.json');

const content = fs.readFileSync(src, 'utf8');
const modified = content.replace(/CREATE TABLE "saving_goal_contributions"/g, 'CREATE TABLE IF NOT EXISTS "saving_goal_contributions"')
                        .replace(/CREATE INDEX/g, 'CREATE INDEX IF NOT EXISTS')
                        .replace(/CREATE UNIQUE INDEX/g, 'CREATE UNIQUE INDEX IF NOT EXISTS')
                        .replace(/ALTER TABLE "saving_goal_contributions" ADD CONSTRAINT/g, 'ALTER TABLE "saving_goal_contributions" DROP CONSTRAINT IF EXISTS "saving_goal_contributions_user_id_user_id_fk";\nALTER TABLE "saving_goal_contributions" DROP CONSTRAINT IF EXISTS "saving_goal_contributions_saving_goal_id_saving_goals_id_fk";\nALTER TABLE "saving_goal_contributions" ADD CONSTRAINT');

fs.writeFileSync(dest, modified);

const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
journal.entries.push({
  idx: 5,
  version: "7",
  when: Date.now(),
  tag: "0005_repair",
  breakpoints: true
});
fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));
console.log("Created 0005_repair");
