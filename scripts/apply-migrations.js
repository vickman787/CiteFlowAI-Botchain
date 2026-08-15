// One-off/reusable helper: applies every supabase/migrations/*.sql file, in
// filename order, against a fresh Postgres database. Useful whenever this
// project gets pointed at a brand-new Supabase project (e.g. a new hackathon
// copy) instead of clicking through the SQL editor by hand.
//
// Usage: MIGRATION_DB_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" node scripts/apply-migrations.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

async function main() {
  if (!process.env.MIGRATION_DB_URL) {
    console.error('Set MIGRATION_DB_URL to the target Postgres connection string first.');
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('Migration order:');
  files.forEach(f => console.log('  ' + f));

  const client = new Client({
    connectionString: process.env.MIGRATION_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected.');

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`\nApplying ${file}...`);
    try {
      await client.query(sql);
      console.log('  OK');
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log('\nAll migrations applied successfully.');
  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
