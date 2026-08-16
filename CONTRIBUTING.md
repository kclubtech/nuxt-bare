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

7. **i18n is optional.** Content fields (category/tag names, post title,
   slug, description) are stored localized as JSON in SQLite. UI copy is
   hardcoded English. New projects that don't need multi-language should
   follow [Single-language mode](#single-language-mode-no-i18n) instead of
   growing the locale files.

## Single-language mode (no i18n)

The starter ships with i18n (en/id) because content fields are localized.
If your project only needs one language, strip it in a few minutes:

1. Remove the `@nuxtjs/i18n` module from `nuxt.config.ts` and delete the
   `i18n/` folder.
2. Delete the locale-aware components: `Common/LanguageContentViewer.vue`
   and the locale switcher in `Dashboard/Navbar.vue`, then drop the
   `useI18n()` calls from the admin list components.
3. In `server/db/schema.ts`, change the JSON columns (`text(..., { mode:
   "json" })` on category/tag `name`/`slug`/`description` and post
   `title`/`slug`/`short_description`/`content`) to plain `text(...)`, then
   run `pnpm db:generate && pnpm db:push`.
4. Simplify the input types in `useCategory.ts` / `useTag.ts` and the blog
   form so `name`/`title` are plain `string` instead of
   `Record<string, string>`.

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
