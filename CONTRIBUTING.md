# Contributing

Setup, commands, and the conventions every contributor should follow.
For how the codebase is organized, read [ARCHITECTURE.md](./ARCHITECTURE.md) first.

## Setup

```bash
pnpm install            # install dependencies
cp .env.example .env    # then fill in secrets (see .env.example)
pnpm db:push            # create the database schema (dev)
pnpm db:seed            # optional: sample data
pnpm dev                # http://localhost:3000
```

The dev server auto-generates `NUXT_SESSION_PASSWORD` in `.env` on first run.
The SQLite database lives at `./database.db` (gitignored).

## Commands

| Command          | Description                                  |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Start dev server on :3000                    |
| `pnpm typecheck` | Type-check (run before pushing)              |
| `pnpm lint`      | Lint with oxlint                             |
| `pnpm format`    | Format with oxfmt (`format:check` to verify) |
| `pnpm test`      | Unit + Nuxt integration tests                |
| `pnpm db:*`      | Database commands (see README)               |

## Conventions

1. **Auto-imports, not imports.** Nuxt auto-imports components, composables,
   and shared utils. Don't `import { ref } from "vue"` or import a composable
   you don't need to. Explicit imports are only for types from `@nuxt/ui`,
   `@/types/*`, or non-auto-imported modules.

2. **Keep pages thin.** A page composes components; logic lives in
   composables. `app/pages/admin/blog/index.vue` is the template to copy —
   it's just `definePageMeta` + one component.

3. **Name things by role.** Data hooks are `useXxxQuery` / `useXxxMutation`.
   Form logic is `useXxxForm`. List pages use `useUrlListState`. If you're
   inventing a new suffix, there's probably an existing pattern to reuse.

4. **The server owns validation and responses.** Every route validates input
   with a shared Zod schema and returns the standard envelope
   (`shared/types/response.ts`). Client code should never guess the shape.

5. **Comments explain why.** If a line's behavior isn't obvious, add a one-line
   comment about the _reason_. Don't comment what the code already says.

6. **No `any` in new code.** Use the inferred types from shared Zod schemas.

7. **i18n is configured but underused.** UI copy is currently hardcoded English
   in most components. If you're touching a component, feel free to move its
   strings into `i18n/locales/en.json` (and `id.json`) — but don't do a
   project-wide sweep without agreement.

## Testing

- `test/unit/` — pure logic (services, repositories, schemas, pagination).
  Fast, no Nuxt context.
- `test/nuxt/` — integration tests that boot Nuxt (API routes, components).

Tests use an isolated `database.test.db`, so your dev data is never touched.
Write a unit test for every new service function and schema.

## Pull requests

- Run `pnpm typecheck` and `pnpm test` before opening a PR.
- Keep PRs focused on one feature/fix.
- If you change the API contract (response shape, route), update the matching
  composable types in the same PR.
