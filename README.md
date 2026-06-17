# NestMatch

Roommate & housing matchmaking for Canada — listings, compatibility-based roommate discovery, group formation, in-app chat, bill splitting (Stripe Connect), identity/background verification (Certn), and a roommate-agreement generator.

## Monorepo layout

npm workspaces:

| Path | What it is |
|---|---|
| `apps/web` | Next.js 16 (App Router, React 19, Tailwind 4). The main product + all API routes. |
| `apps/mobile` | Expo / React Native (expo-router, TanStack Query). |
| `packages/shared` | Shared types/constants (DB types — see note below). |
| `supabase/migrations` | Postgres schema, RLS policies, RPCs. |

> Note: `apps/web/src/types/database.ts` and `packages/shared/src/types/database.ts` are currently
> two hand-maintained copies and can drift. Consolidating to a single generated source is tracked in
> `docs/audit-2026-06-10.md` (task 2.1).

## Prerequisites

- Node 20+
- npm 10+
- A Supabase project (Postgres + Auth + Storage)
- Accounts as needed: Stripe, Certn, Resend, Google Maps

## Setup

```bash
npm install
cp apps/web/.env.local.example apps/web/.env.local   # then fill in values
```

Required environment variables are validated at boot (`apps/web/src/lib/env.ts`); a missing core var
fails fast with the variable's name. See `apps/web/.env.local.example` for the full list.

For local DB scripts that need the service-role key, run `vercel env pull` (see project memory).

## Running

```bash
npm run dev:web        # Next.js dev server (apps/web)
npm run dev:mobile     # Expo (apps/mobile)
```

## Checks

```bash
npm run typecheck      # all workspaces
npm run lint           # all workspaces
```

CI (`.github/workflows/ci.yml`) runs typecheck + lint on every PR.

## Database

Migrations live in `supabase/migrations/` (numbered). Apply them through your Supabase workflow;
do not apply untested migrations directly against production. Staged prod SQL lives in `_qa_apply/`.

## Deployment

Web deploys to Vercel from `main` (auto-deploy on merge). Run Vercel commands from the repo root —
the real production project is `nestmatch-app`.

## Further reading

- `docs/audit-2026-06-10.md` — technical audit + improvement roadmap (CI, tests, webhook hardening).
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — feature designs and implementation plans.
