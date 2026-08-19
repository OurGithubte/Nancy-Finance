import git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

const dir = process.cwd();

async function run() {
  const status = await git.statusMatrix({ fs, dir });
  console.log('--- GIT STATUS ---');
  let changes = 0;
  for (const row of status) {
    if (row[1] !== row[2] || row[2] !== row[3]) {
      console.log(`${row[0]}: ${row[1]} ${row[2]} ${row[3]}`);
      changes++;
      await git.add({ fs, dir, filepath: row[0] });
    }
  }
  
  if (changes > 0) {
    console.log(`Added ${changes} files to staging.`);
    const sha = await git.commit({
      fs,
      dir,
      author: {
        name: 'Nancy Finance Developer',
        email: 'dev@nancyfinance.vn',
      },
      message: 'feat: implement Phase 2 for Credit Cards & Loans'
    });
    console.log(`Committed with SHA: ${sha}`);
  } else {
    console.log('No changes to commit.');
  }

  const log = await git.log({ fs, dir, depth: 1 });
  console.log('--- GIT LOG ---');
  console.log(`${log[0].oid.substring(0, 7)} ${log[0].commit.message}`);
}

run().catch(console.error);
