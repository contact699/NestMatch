# Mojibake Operator Runbook

> Last updated: 2026-05-25 — initial scan was clean.

## What is mojibake?

Garbled text caused by interpreting UTF-8 bytes as Latin-1 and re-encoding as UTF-8.
Example: `Régie` (correct) becomes `RÃ©gie` (mojibake). The character is now two bytes
that look like garbage.

## Pre-flight state

A full DB scan run on 2026-05-25 (commit on `seo/plan-2-mojibake` branch) returned
zero mojibake hits across `listings.title`, `listings.description`, `resources.title`,
`resources.excerpt`, `faqs.question`, `faqs.answer`, `profiles.name`, `profiles.bio`.

If Codex originally observed mojibake on rendered pages, it was likely either:
- already silently fixed by a prior commit before this scan, OR
- rendered-output mojibake from a UI-side encoding bug (no longer reproducing).

The scanner exists from this point on as a **regression guard**, not a fix for a
known issue. Run it in CI so any new mojibake getting written to the DB is caught.

## How NestMatch handles it

Two scripts in `apps/web/scripts/` plus a shared pattern table:

- **`apps/web/scripts/lib/mojibake-patterns.ts`** — replacement table (35 known
  sequences) + helpers `hasMojibake()`, `fixMojibake()`, `findMojibakePatterns()`.
- **`apps/web/scripts/scan-mojibake.ts`** — read-only. Reports any mojibake in
  `listings`, `resources`, `faqs`, `profiles`. Exits 1 if any found, 0 if clean.
- **(future) `apps/web/scripts/backfill-mojibake.ts`** — not built. If the scanner
  ever fires, build this script per `docs/superpowers/plans/2026-05-23-seo-plan-2-mojibake-fix.md`
  Tasks 4-6.

npm script entries (already wired into `apps/web/package.json`):

- `npm run scan:mojibake` — manual run
- `npm run check:mojibake` — alias of scan, intended for CI

Both forward to `npx tsx scripts/scan-mojibake.ts`. The env it needs is the same
service-role key the rest of the scripts use; populate `apps/web/.env.local` via
`vercel env pull apps/web/.env.local` first (see project memory
`reference_local_db_scripts_env.md`).

## CI wiring (the deliverable for Plan 2 Task 7)

The actual CI step is a one-line change in your build pipeline:

```bash
npm run check:mojibake --prefix apps/web
```

A non-zero exit means the live DB has mojibake content; the build should fail until
it's fixed.

### GitHub Actions

Add to `.github/workflows/<your-workflow>.yml` after the install step:

```yaml
- name: Check DB for mojibake
  run: npm run check:mojibake --prefix apps/web
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Vercel build

Add to project settings → Build & Development → Build command:

```
npm run check:mojibake --prefix apps/web && next build
```

(Pair this with the existing `npm run check:sitemap --prefix apps/web` step from
SEO Plan 1 Hotfix 8, so both checks gate every deploy.)

### Nightly cron alternative

If you'd rather not block PR builds on a live-DB check, run it as a scheduled job
(GitHub Actions cron, Vercel cron, or any external scheduler) and surface the
result via your usual alerting channel. The script's behavior is identical either
way.

## If the scanner ever fires

The scanner exits 1 and prints something like:

```
FOUND Mojibake found in 17 row/column(s):

  listings.title: 4 row(s)
    - <uuid>: â€™
      sample: Cozy doublê€™s room in Mile End ...
    - ... and 1 more
  listings.description: 9 row(s)
    ...
  resources.excerpt: 4 row(s)
    ...
```

Steps to resolve:

1. **Investigate fresh writes.** The DB was clean as of 2026-05-25, so any new
   mojibake came in after that. Look at recent form submissions, API insertions,
   or admin tooling that wrote to the affected table. Check git log for changes
   to the relevant form handler / API route since the last clean run.
2. **Build the backfill script.** The original plan
   (`docs/superpowers/plans/2026-05-23-seo-plan-2-mojibake-fix.md`, Tasks 4-6) has
   the full implementation spec for a dry-runnable backfill. Build it then.
3. **Dry-run first.** Always inspect the snapshot JSON before committing the
   backfill. False-positive replacements can mangle legitimate content.
4. **Apply the fix.** Then **immediately re-run `scan:mojibake`** to confirm
   clean.
5. **Fix the source.** If the scanner keeps firing, the write path is broken.
   Don't keep backfilling — fix the form/API/handler that's inserting mojibake.

## Rolling back a bad backfill

(Only relevant if a backfill is run.)

The backfill script per the original plan writes a JSON snapshot of all changes
to `apps/web/scripts/mojibake-backup-<timestamp>.json` before applying any of
them. For each entry the file has `before`, `after`, `table`, `column`, `id`.
To revert: `UPDATE <table> SET <column> = '<before>' WHERE id = '<id>'`.

Don't lose the snapshot file — it's the only record of the pre-state. Move it
out of `apps/web/scripts/` into a longer-term location after the backfill is
verified.

## Related

- Plan 2 spec: `docs/superpowers/plans/2026-05-23-seo-plan-2-mojibake-fix.md`
- Pattern table: `apps/web/scripts/lib/mojibake-patterns.ts`
- Scanner: `apps/web/scripts/scan-mojibake.ts`
- CI sibling check: `npm run check:sitemap` (also gates SEO correctness)
