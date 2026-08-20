# Nancy Finance — Database Migration Runbook

## Source of truth

Nancy Finance uses exactly one migration chain:

- Source files: `src/db/migrations/*.sql`
- Drizzle metadata: `src/db/migrations/meta/`
- Database history: `drizzle.__drizzle_migrations`

`public.__drizzle_migrations` is legacy and must not exist.

## Normal workflow

After changing `src/db/schema`:

```powershell
pnpm db:generate
pnpm db:verify
pnpm db:migrate
pnpm db:verify
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm db:verify` is read-only. It checks:

- journal entries match SQL migration files;
- every journal entry has a snapshot;
- migration SHA256 values match database history;
- Drizzle timestamps match the journal;
- there is no legacy public migration history table;
- critical schema fields required by the application exist.

## Environment guard

Set one explicit database target in `.env.local`:

```env
DB_ENV=development
```

Allowed values:

- `development`
- `test`
- `production`

### Production

`db:push` is permanently blocked for production.

Production must use generated migrations. After reviewing the SQL, enable the acknowledgement for the current command/session only:

```powershell
$env:DB_ENV="production"
$env:ALLOW_PRODUCTION_DB_MIGRATION="YES_I_UNDERSTAND"
pnpm db:migrate
Remove-Item Env:ALLOW_PRODUCTION_DB_MIGRATION
```

Do not store `ALLOW_PRODUCTION_DB_MIGRATION` permanently in `.env.local` or Vercel.

## Forbidden patterns

Never:

- manually insert hashes into `drizzle.__drizzle_migrations`;
- manually mark a failed migration as applied;
- create a journal entry without its SQL and snapshot;
- run `drizzle-kit push` against production;
- make a script named `verify` or `check` mutate the database;
- maintain a second migration history table under `public`.

## Emergency hotfix

If production requires an emergency schema hotfix:

1. Verify the exact missing schema element.
2. Test the change on a Neon temporary branch first.
3. Apply only after approval.
4. Immediately reconcile Drizzle source, journal, snapshot, and migration history.
5. Run `pnpm db:verify` and production runtime verification before continuing development.

A hotfix is not complete until migration integrity is restored.
