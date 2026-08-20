// Deprecated intentionally.
//
// Historical versions of this script manually inserted rows into
// drizzle.__drizzle_migrations without executing the corresponding SQL.
// That can make Drizzle believe a migration ran when the database schema did not change.
//
// Keep this file as an explicit guard so old commands fail loudly instead of silently
// corrupting migration history.

throw new Error(
  "scripts/insert-migrations.ts is disabled. Use the controlled Drizzle migration workflow (pnpm db:migrate:safe) instead."
);
