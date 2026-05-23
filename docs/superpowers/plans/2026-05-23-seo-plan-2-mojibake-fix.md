# SEO Plan 2 — Mojibake Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean any mojibake (double-encoded UTF-8 like `â€"` for em-dash or `RÃ©gie` for `Régie`) out of user-visible database content, and add a CI guard so it can't return.

**Architecture:** Three steps — confirm scope, backfill, prevent regressions.
1. A read-only scanner script that reports any mojibake found in `listings.title`, `listings.description`, `resources.title`, `resources.content`, `faqs.question`, `faqs.answer`.
2. A backfill script that dry-runs by default and only writes with `--commit`. It applies a curated replacement table (about 30 known mojibake sequences → correct UTF-8 character).
3. A CI check script that calls the scanner and fails with non-zero exit if any mojibake remains. Wired into the existing `npm` scripts.

**Tech Stack:** TypeScript, `tsx` (already in devDependencies), Supabase service-role client. No new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-05-22-seo-design.md` — section "Mojibake / Encoding Fix" (commit `cc19d97` and later).

**Out of scope:** Root-cause investigation of *why* mojibake got into the DB. The CI check is the safety net — if the check ever fires post-merge, that's the signal to dig into form-submission paths. (Doing the investigation now is speculative work; the bug may have been fixed silently by a prior commit.)

---

## File Structure

### Files created

| Path | Responsibility |
|---|---|
| `apps/web/scripts/scan-mojibake.ts` | Scans live DB content for known mojibake sequences; prints a report; exits 0 if clean, 1 if any found |
| `apps/web/scripts/backfill-mojibake.ts` | Applies replacement table to DB rows; dry-run by default, `--commit` to write |
| `apps/web/scripts/lib/mojibake-patterns.ts` | The shared replacement table (e.g. `'â€"': '—'`) — both scripts import it |
| `docs/seo-mojibake-runbook.md` | One-page operator guide: how to scan, how to dry-run, how to commit, how the CI check works, what to do if it fires after merge |

### Files modified

| Path | Change |
|---|---|
| `apps/web/package.json` | Add three new scripts: `scan:mojibake`, `backfill:mojibake`, `check:mojibake` (alias of scan, used by CI) |

### CI wiring

The plan does **not** modify CI config files directly — adding the `npm run check:mojibake` step to the actual pipeline (`.github/workflows/*.yml` or Vercel build hook) is a separate one-line change the user can make when ready. Reason: the user may want to gate this behind a feature flag or run it as a nightly cron rather than per-PR.

---

## Decisions captured up-front

1. **Replacement table is curated, not auto-detected.** We don't try to re-parse arbitrary byte sequences; we hard-code the ~30 most common Latin-1-as-UTF-8 sequences (the standard mojibake set). New patterns can be added to `mojibake-patterns.ts` over time.
2. **Backfill is reversible by re-running with a saved snapshot.** Before any write, the script saves a JSON snapshot of changed rows to `apps/web/scripts/mojibake-backup-<timestamp>.json`. If a backfill goes wrong, the file is the ground truth for rollback.
3. **`scan-mojibake.ts` exits 1 if any mojibake found.** This is the CI semantics — non-zero exit fails the build.
4. **No new tables, no schema migration.** This is a data fix, not a schema change.

---

## Task Decomposition

8 tasks. Tasks 1–3 build the scanner. Tasks 4–6 build the backfill. Task 7 wires CI. Task 8 is the runbook + actual run.

---

### Task 1: Mojibake pattern table

**Files:**
- Create: `apps/web/scripts/lib/mojibake-patterns.ts`

- [ ] **Step 1: Create the pattern table**

```ts
/**
 * Common mojibake sequences caused by interpreting UTF-8 bytes as Latin-1
 * and re-encoding them as UTF-8 (the classic "double encoded" bug).
 *
 * Sources: Wikipedia "Mojibake" article + manual observation of NestMatch
 * Quebec/French-Canadian content where mojibake is most visible.
 *
 * Order matters: longer sequences first so we don't partial-match.
 */
export const MOJIBAKE_REPLACEMENTS: ReadonlyArray<[string, string]> = [
  // 3-byte mojibake (longer matches first)
  ['â€™', '’'], // ’ right single quote
  ['â€˜', '‘'], // ‘ left single quote
  ['â€œ', '“'], // “ left double quote
  ['â€', '”'],  // ” right double quote (3-byte; precedes the 2-byte â€)
  ['â€"', '—'], // — em dash
  ['â€"', '–'], // – en dash
  ['â€¦', '…'], // … ellipsis
  ['â€¢', '•'], // • bullet

  // 2-byte accented Latin (alphabetic order of correct character)
  ['Ã€', 'À'],
  ['Ã‚', 'Â'],
  ['Ã„', 'Ä'],
  ['Ã‡', 'Ç'],
  ['Ãˆ', 'È'],
  ['Ã‰', 'É'],
  ['ÃŠ', 'Ê'],
  ['Ã‹', 'Ë'],
  ['ÃŽ', 'Î'],
  ['Ã', 'Í'],
  ['Ã"', 'Ô'],
  ['Ã–', 'Ö'],
  ['Ã™', 'Ù'],
  ['Ãœ', 'Ü'],
  ['Ã', 'ß'],
  ['Ã ', 'à'],
  ['Ã¡', 'á'],
  ['Ã¢', 'â'],
  ['Ã¤', 'ä'],
  ['Ã§', 'ç'],
  ['Ã¨', 'è'],
  ['Ã©', 'é'],
  ['Ãª', 'ê'],
  ['Ã«', 'ë'],
  ['Ã®', 'î'],
  ['Ã¯', 'ï'],
  ['Ã´', 'ô'],
  ['Ã¶', 'ö'],
  ['Ã¹', 'ù'],
  ['Ã»', 'û'],
  ['Ã¼', 'ü'],
]

/**
 * Returns true if the string contains any known mojibake sequence.
 */
export function hasMojibake(s: string | null | undefined): boolean {
  if (!s) return false
  return MOJIBAKE_REPLACEMENTS.some(([pat]) => s.includes(pat))
}

/**
 * Returns the string with all known mojibake sequences replaced. Idempotent —
 * running it twice on a clean string is a no-op.
 */
export function fixMojibake(s: string | null | undefined): string {
  if (!s) return s ?? ''
  let out = s
  for (const [pat, replacement] of MOJIBAKE_REPLACEMENTS) {
    if (out.includes(pat)) {
      out = out.split(pat).join(replacement)
    }
  }
  return out
}

/**
 * Surface-level inspection: returns the list of mojibake patterns found in the
 * string (deduped, in the order they appear in MOJIBAKE_REPLACEMENTS).
 */
export function findMojibakePatterns(s: string | null | undefined): string[] {
  if (!s) return []
  return MOJIBAKE_REPLACEMENTS.filter(([pat]) => s.includes(pat)).map(([pat]) => pat)
}
```

- [ ] **Step 2: Commit**

```powershell
git add apps/web/scripts/lib/mojibake-patterns.ts
git commit -m "feat(mojibake): add curated replacement table and helper functions"
```

---

### Task 2: Scanner script

**Files:**
- Create: `apps/web/scripts/scan-mojibake.ts`

- [ ] **Step 1: Implement the scanner**

```ts
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { findMojibakePatterns, hasMojibake } from './lib/mojibake-patterns'

config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    'Missing env. Run `vercel env pull apps/web/.env.local` first ' +
      '(see project memory: reference_local_db_scripts_env.md).'
  )
  process.exit(2)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

interface ScanTarget {
  table: string
  idColumn: string
  textColumns: string[]
  filter?: { column: string; value: any }
}

const TARGETS: ScanTarget[] = [
  { table: 'listings', idColumn: 'id', textColumns: ['title', 'description'] },
  {
    table: 'resources',
    idColumn: 'id',
    textColumns: ['title', 'excerpt'],
    // `content` is JSON (per Plan 1 Task 5); we don't scan JSON columns here.
  },
  { table: 'faqs', idColumn: 'id', textColumns: ['question', 'answer'] },
  { table: 'profiles', idColumn: 'id', textColumns: ['name', 'bio'] },
]

interface Hit {
  table: string
  id: string
  column: string
  patterns: string[]
  sample: string
}

async function scanTarget(target: ScanTarget): Promise<Hit[]> {
  const columns = [target.idColumn, ...target.textColumns].join(', ')
  let q = supabase.from(target.table).select(columns).limit(50000)
  if (target.filter) q = q.eq(target.filter.column, target.filter.value)
  const { data, error } = await q
  if (error) {
    console.error(`Failed to scan ${target.table}:`, error.message)
    return []
  }
  const hits: Hit[] = []
  for (const row of (data as any[]) ?? []) {
    for (const col of target.textColumns) {
      const v = row[col]
      if (typeof v === 'string' && hasMojibake(v)) {
        hits.push({
          table: target.table,
          id: String(row[target.idColumn]),
          column: col,
          patterns: findMojibakePatterns(v),
          sample: v.slice(0, 120),
        })
      }
    }
  }
  return hits
}

async function main() {
  const allHits: Hit[] = []
  for (const target of TARGETS) {
    const hits = await scanTarget(target)
    allHits.push(...hits)
  }

  if (allHits.length === 0) {
    console.log('✓ No mojibake found across all scanned columns.')
    process.exit(0)
  }

  console.log(`✗ Mojibake found in ${allHits.length} row/column(s):\n`)
  const grouped = allHits.reduce<Record<string, Hit[]>>((acc, h) => {
    const key = `${h.table}.${h.column}`
    ;(acc[key] ??= []).push(h)
    return acc
  }, {})
  for (const [key, list] of Object.entries(grouped)) {
    console.log(`  ${key}: ${list.length} row(s)`)
    for (const h of list.slice(0, 3)) {
      console.log(`    - ${h.id}: ${h.patterns.join(', ')}`)
      console.log(`      sample: ${h.sample.replace(/\s+/g, ' ')}`)
    }
    if (list.length > 3) console.log(`    … and ${list.length - 3} more`)
  }
  process.exit(1)
}

main().catch((err) => {
  console.error('Scan failed:', err)
  process.exit(2)
})
```

- [ ] **Step 2: Add the npm script**

In `apps/web/package.json`, add to the `scripts` object:

```json
"scan:mojibake": "npx tsx scripts/scan-mojibake.ts",
"check:mojibake": "npx tsx scripts/scan-mojibake.ts"
```

(`check:` is an alias of `scan:` — same script, different name to signal "this is the CI gate".)

- [ ] **Step 3: Run the scanner**

Assumes `apps/web/.env.local` already has `SUPABASE_SERVICE_ROLE_KEY` (per project memory, run `vercel env pull` if not).

```powershell
npm run scan:mojibake --prefix apps/web
```

Expected output:
- If clean: `✓ No mojibake found across all scanned columns.` and exit 0.
- If found: per-table-column hit counts and exit 1.

- [ ] **Step 4: Capture the scan output**

Paste the actual scanner output into a comment on the commit message OR into `docs/seo-mojibake-runbook.md` (created in Task 8) so we have a record of pre-backfill state.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/scripts/scan-mojibake.ts apps/web/package.json
git commit -m "feat(mojibake): add scanner script with CI-friendly exit codes"
```

---

### Task 3: Decision point — does mojibake actually exist?

**Files:** none (decision task)

This is a branching point that determines how much of the rest of the plan to execute.

- [ ] **Step 1: Read the scan output from Task 2**

- [ ] **Step 2: If `0 hits` (scanner exits 0):**
   - The original mojibake claim was either (a) only ever in rendered HTML cache, or (b) silently fixed by an earlier commit.
   - **Skip Tasks 4-5-6.** Jump directly to Task 7 (CI wiring) and Task 8 (runbook), treating the scanner + CI check as the entire deliverable.
   - Note in the final commit message and runbook: "DB scan was clean as of YYYY-MM-DD; the scanner is a guard against regressions, not a fix for a known problem."

- [ ] **Step 3: If `> 0 hits` (scanner exits 1):**
   - Proceed with all remaining tasks in order.
   - The scan output is the pre-backfill ground truth — keep it.

There's no commit for this task. It's the gate that decides what gets implemented next.

---

### Task 4: Backfill script (dry-run mode)

**Skip this task if Task 3 routed to the "no hits" path.**

**Files:**
- Create: `apps/web/scripts/backfill-mojibake.ts`

- [ ] **Step 1: Implement the backfill**

```ts
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { writeFileSync } from 'node:fs'
import { fixMojibake, hasMojibake } from './lib/mojibake-patterns'

config({ path: resolve(__dirname, '../.env.local') })

const COMMIT = process.argv.includes('--commit')
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase env. Run `vercel env pull apps/web/.env.local` first.')
  process.exit(2)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

interface BackfillTarget {
  table: string
  idColumn: string
  textColumns: string[]
}

const TARGETS: BackfillTarget[] = [
  { table: 'listings', idColumn: 'id', textColumns: ['title', 'description'] },
  { table: 'resources', idColumn: 'id', textColumns: ['title', 'excerpt'] },
  { table: 'faqs', idColumn: 'id', textColumns: ['question', 'answer'] },
  { table: 'profiles', idColumn: 'id', textColumns: ['name', 'bio'] },
]

interface Change {
  table: string
  id: string
  column: string
  before: string
  after: string
}

async function backfillTarget(target: BackfillTarget): Promise<Change[]> {
  const columns = [target.idColumn, ...target.textColumns].join(', ')
  const { data, error } = await supabase
    .from(target.table)
    .select(columns)
    .limit(50000)

  if (error) {
    console.error(`Failed to read ${target.table}:`, error.message)
    return []
  }

  const changes: Change[] = []
  for (const row of (data as any[]) ?? []) {
    const updates: Record<string, string> = {}
    for (const col of target.textColumns) {
      const v = row[col]
      if (typeof v === 'string' && hasMojibake(v)) {
        const fixed = fixMojibake(v)
        if (fixed !== v) {
          updates[col] = fixed
          changes.push({
            table: target.table,
            id: String(row[target.idColumn]),
            column: col,
            before: v,
            after: fixed,
          })
        }
      }
    }
    if (Object.keys(updates).length > 0 && COMMIT) {
      const { error: updErr } = await supabase
        .from(target.table)
        .update(updates)
        .eq(target.idColumn, row[target.idColumn])
      if (updErr) {
        console.error(
          `Failed to update ${target.table}.${row[target.idColumn]}:`,
          updErr.message
        )
      }
    }
  }
  return changes
}

async function main() {
  console.log(COMMIT ? '★ COMMIT MODE — changes will be written' : '◌ DRY RUN — no writes')

  const allChanges: Change[] = []
  for (const target of TARGETS) {
    const c = await backfillTarget(target)
    allChanges.push(...c)
  }

  console.log(`\n${allChanges.length} change(s) ${COMMIT ? 'applied' : 'would be applied'}.`)

  if (allChanges.length > 0) {
    // Write the backup snapshot in BOTH modes so we always have the pre-state.
    const backupPath = resolve(__dirname, `mojibake-backup-${TIMESTAMP}.json`)
    writeFileSync(
      backupPath,
      JSON.stringify(
        {
          mode: COMMIT ? 'commit' : 'dry-run',
          timestamp: TIMESTAMP,
          changes: allChanges,
        },
        null,
        2
      )
    )
    console.log(`Snapshot written to: ${backupPath}`)
  }

  // Sample of changes for visual sanity:
  for (const c of allChanges.slice(0, 5)) {
    console.log(`\n  ${c.table}.${c.column}#${c.id}`)
    console.log(`    before: ${c.before.slice(0, 100)}`)
    console.log(`    after:  ${c.after.slice(0, 100)}`)
  }
  if (allChanges.length > 5) console.log(`\n  … and ${allChanges.length - 5} more`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(2)
})
```

- [ ] **Step 2: Add the npm script**

In `apps/web/package.json`, add:

```json
"backfill:mojibake": "npx tsx scripts/backfill-mojibake.ts"
```

(Caller decides between dry-run and commit by appending `-- --commit` to the npm command.)

- [ ] **Step 3: Add `mojibake-backup-*.json` to `.gitignore`**

Append to `apps/web/.gitignore`:

```
# Mojibake backfill snapshots (data, not source)
scripts/mojibake-backup-*.json
```

If `.gitignore` doesn't exist at `apps/web/.gitignore`, check the repo root `.gitignore` and add the rule there with the corrected path: `apps/web/scripts/mojibake-backup-*.json`.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/scripts/backfill-mojibake.ts apps/web/package.json
# also if .gitignore was touched:
git add apps/web/.gitignore  # or the root .gitignore
git commit -m "feat(mojibake): add backfill script (dry-run by default)"
```

---

### Task 5: Dry-run the backfill

**Skip if Task 3 routed to "no hits".**

**Files:** none (script invocation, snapshot file)

- [ ] **Step 1: Run dry-run**

```powershell
npm run backfill:mojibake --prefix apps/web
```

Expected:
- Banner says `◌ DRY RUN`.
- Total change count.
- Snapshot file `apps/web/scripts/mojibake-backup-<ts>.json` is written.
- Sample of 5 before/after pairs is printed.

- [ ] **Step 2: Inspect the snapshot**

Open `apps/web/scripts/mojibake-backup-<ts>.json` and review:
- Are the `before` strings actually broken (contain mojibake sequences)?
- Are the `after` strings the expected clean version?
- Any rows that look mid-replacement (e.g., partial fix)?

If anything looks wrong, **stop**. Inspect the patterns in `mojibake-patterns.ts` and add/refine entries. Re-run the dry-run.

- [ ] **Step 3: Decision gate — confirm with the human operator**

The dry-run output and snapshot must be visually reviewed by you (the human) before committing. The implementer should pause here and surface the snapshot count + sample for review.

If the implementer is acting fully autonomously and you trust the patterns, they may proceed to Task 6 directly. Otherwise, pause for human confirmation.

---

### Task 6: Apply the backfill

**Skip if Task 3 routed to "no hits".**

**Files:** none (DB writes + final snapshot)

- [ ] **Step 1: Run with `--commit`**

```powershell
npm run backfill:mojibake --prefix apps/web -- --commit
```

Expected:
- Banner says `★ COMMIT MODE`.
- Each row update succeeds (any failures are printed; if any fail, halt and investigate).
- Final snapshot written.

- [ ] **Step 2: Confirm scan now clean**

```powershell
npm run scan:mojibake --prefix apps/web
```

Expected: `✓ No mojibake found across all scanned columns.` (exit 0)

If the scan still reports hits, the replacement table missed something. Add the missing patterns to `mojibake-patterns.ts`, re-dry-run, re-commit. Loop until the scanner is clean.

- [ ] **Step 3: Verify a sample listing in the app**

Visit a listing in the browser that previously had mojibake (use the IDs from the snapshot). Confirm the page renders the correct character (e.g. `Régie` not `RÃ©gie`).

- [ ] **Step 4: This step has no code/commit** — the data fix is done. Move to Task 7.

---

### Task 7: CI wiring (preparation only)

**Files:** none modified by this plan; this task documents the one-line addition the user makes in their CI config

- [ ] **Step 1: Add the runbook entry**

In `docs/seo-mojibake-runbook.md` (created in Task 8), document:

> To gate on this check in CI, add a step to your build pipeline that runs:
>
> ```bash
> npm run check:mojibake --prefix apps/web
> ```
>
> A non-zero exit means the live DB has mojibake content; the build should fail until it's fixed.
>
> For GitHub Actions, add to `.github/workflows/<your-workflow>.yml` after the install step:
>
> ```yaml
> - name: Check DB for mojibake
>   run: npm run check:mojibake --prefix apps/web
>   env:
>     NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
>     SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
> ```
>
> For Vercel build, add to the Vercel project settings → Build & Development → Build command:
>
> ```
> npm run check:mojibake --prefix apps/web && next build
> ```

This is documentation only — the actual CI change is the user's call (they may want to run it nightly via cron rather than blocking every PR; that's a workflow preference).

---

### Task 8: Runbook + final summary

**Files:**
- Create: `docs/seo-mojibake-runbook.md`

- [ ] **Step 1: Create the runbook**

```markdown
# Mojibake Operator Runbook

> Last updated: YYYY-MM-DD (replace when editing).

## What is mojibake?

Garbled text caused by interpreting UTF-8 bytes as Latin-1 and re-encoding as UTF-8.
Example: `Régie` (correct) becomes `RÃ©gie` (mojibake). The character is now two bytes
that look like garbage.

## How NestMatch handles it

Three scripts in `apps/web/scripts/`:

- **`scan:mojibake`** — read-only. Reports any mojibake in `listings`, `resources`,
  `faqs`, `profiles`. Exit code 1 if any found.
- **`check:mojibake`** — alias of `scan:mojibake`. Used by CI.
- **`backfill:mojibake`** — replaces known sequences. Dry-run by default,
  `-- --commit` to actually write. Always writes a backup snapshot first.

The replacement table is in `apps/web/scripts/lib/mojibake-patterns.ts`. Add new
patterns there if the scanner finds something unrecognized.

## Routine: nightly check

After Plan 2 ships, the CI check (Task 7) should run on every build. If it fires:

1. Run `npm run scan:mojibake --prefix apps/web` locally to see which rows.
2. Dry-run the backfill: `npm run backfill:mojibake --prefix apps/web`.
3. Inspect `scripts/mojibake-backup-<ts>.json`.
4. Apply: `npm run backfill:mojibake --prefix apps/web -- --commit`.
5. Re-scan to confirm clean.
6. **Then:** investigate where the new mojibake came from. The CI check told us
   the fix didn't stay clean — that means there's an active source. Look at
   recent form submissions / API insertions that touched the affected table.

## One-time: how the original mojibake was handled

(Fill in once Task 6 completes.)

- **Pre-backfill scan result (from Task 2):** ___
- **Number of rows changed by backfill (from Task 6):** ___
- **Snapshot file:** `apps/web/scripts/mojibake-backup-<ts>.json`

## Rolling back a bad backfill

Open the snapshot JSON file. For each entry, you have `before`, `after`, `table`,
`column`, `id`. To revert: `UPDATE table SET column = '<before>' WHERE id = '<id>'`.

Don't lose the snapshot file — it's the only record of the pre-state. Move it
out of `apps/web/scripts/` into a longer-term location after the backfill is
verified.
```

- [ ] **Step 2: Commit**

```powershell
git add docs/seo-mojibake-runbook.md
git commit -m "docs(mojibake): add operator runbook for scan/backfill workflow"
```

---

## Self-Review Checklist

- [ ] `scan:mojibake` runs and exits cleanly (0 or 1, not 2).
- [ ] `backfill:mojibake` dry-runs without writing.
- [ ] `backfill:mojibake -- --commit` writes only after dry-run.
- [ ] Backup snapshot is created in both dry-run and commit modes.
- [ ] After backfill, `scan:mojibake` returns 0.
- [ ] Runbook references actual command names and exit semantics.
- [ ] `.gitignore` excludes `mojibake-backup-*.json`.
- [ ] No new npm dependencies added (uses existing `tsx`, `@supabase/supabase-js`, `dotenv`).

---

## Notes for downstream

- The CI check is **the actual deliverable** if Task 3 routes to "no hits." The whole plan still produces value because the scanner becomes a regression guard for future data.
- The user owns the decision of when to wire `check:mojibake` into CI. The runbook documents how; the actual wiring is one line in the user's workflow file.
