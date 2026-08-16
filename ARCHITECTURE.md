# Architecture

How this project is organized and how to add features to it. Read this before
writing your first feature — it will save you from guessing.

## Stack

- **Nuxt 4** (Vue 3, Nitro server), Nuxt UI v4 + Tailwind CSS v4
- **Drizzle ORM** over SQLite (`better-sqlite3`)
- **Pinia + Pinia Colada** for client-side data fetching (admin panel)
- **nuxt-auth-utils** for sessions, **Zod** for validation, `@nuxtjs/i18n` for `en`/`id`

## The three layers

```
┌─────────────────────────────────────────────────────────┐
│ app/     Vue pages, components, composables (client)     │
│ shared/  Types, Zod schemas, config — used by both sides │
│ server/  API routes, services, repositories, DB schema   │
└─────────────────────────────────────────────────────────┘
```

### `shared/` — the contract between client and server

Everything both sides agree on lives here:

- `shared/types/` — entity types (`blog.ts`, `user.ts`) and the API envelope
  (`response.ts`)
- `shared/utils/schema/` — Zod schemas. Server routes validate with them;
  the inferred `*Input` types are reused by client forms.
- `shared/config/` — constants like pagination defaults.

> Rule: if both the client and the server need a type or schema, it goes in
> `shared/`, not in `app/` or `server/`. `app/types/*` and `app/types/response.ts`
> only re-export from `shared/` for convenience — don't define new types there.

### `server/` — the API

- **`server/api/`** — one file per endpoint, named `[path].[method].ts`
  (e.g. `server/api/admin/blog/index.get.ts`). A route file only parses input,
  calls a service, and returns the result. No business logic here.
- **`server/utils/`** — the actual logic, grouped by domain:
  - `<domain>/service.ts` — business logic (what the feature does)
  - `<domain>/repository.ts` — data access (raw Drizzle queries)
  - `common/` — shared helpers: `response.ts` (response envelope),
    `pagination.ts`, `localization.ts`, `email.ts`
- **`server/db/`** — Drizzle `schema.ts`, migrations, seed.

**Auth/permissions:** use `defineAuthHandler(handler, access)` from
`server/utils/auth-event-handler.ts` instead of `defineEventHandler` for any
endpoint that requires a logged-in user. `access` is either a role list
(`["admin"]`) or an object with `role` and/or `permissions`
(`{ permissions: "blog:create" }`). The handler passes `{ user, language }` to
your handler.

**Response envelope** — every endpoint returns one of these (see
`shared/types/response.ts`):

```ts
// Single resource
{ message: string, data: T }

// Paginated list
{ message: string, data: T[], meta: { page, per_page, total } }
```

Build them with `jsonResponse(data)` / `createPaginationResponse(...)` from
`server/utils/common/` — never hand-roll the shape.

**Localization:** localized fields (post titles, slugs, categories) are stored
as JSON translation records: `{ en: "…", id: "…" }`. Resolve them with
`localizeField(record, language)` (fallback: requested → `en` → first value).

### `app/` — the client

- **`app/pages/`** — routes. Keep pages thin; they compose components and
  composables.
- **`app/components/`** — components grouped by area (`Admin/`, `Auth/`,
  `Common/`, `Profile/`, `Dashboard/`). All components are auto-imported.
- **`app/composables/`** — the pattern that makes features easy to add:
  - `useXxxQuery()` — read data (Pinia Colada `useQuery`)
  - `useXxxMutation()` / `useXxxCreate/Update/DeleteMutation()` — write data
  - `useXxxForm()` — form state + submission
  - `useUrlListState()` — list page state (search, page, filters) synced to the
    URL; use this for every paginated list instead of re-implementing it
- **`app/middleware/`** — `auth` (requires login, blocks non-admins from
  `/admin`) and `guest` (redirects logged-in users away from auth pages).
- **`app/layouts/`** — `default`, `auth`, `admin`.

Data fetching split: the **admin panel** uses Pinia Colada (`useQuery` /
`useMutation` with cache invalidation), the **public pages** use Nuxt's
`useAsyncData`. Keep new code in the same bucket as its neighbors.

## Request flow

Using "list admin blog posts" as the example:

```
app/pages/admin/blog/index.vue          → thin page, renders AdminBlogList
  └─ app/components/Admin/Blog/List.vue → useUrlListState + usePostsQuery
       └─ app/composables/useBlog.ts    → $fetch("/api/admin/blog?page=…&search=…")
            → server/api/admin/blog/index.get.ts
                 validates query (Zod) + auth (defineAuthHandler)
                 → server/utils/post/service.ts (getPosts)
                      → Drizzle queries against server/db/schema.ts
                 ← createPaginationResponse(data, total, page, limit)
            ← { message, data, meta }
```

## Adding a new feature — worked example

Adding a `comments` admin CRUD, end to end:

1. **Schema** — add tables in `server/db/schema.ts`, then
   `pnpm db:generate` (migration) or `pnpm db:push` (dev-only) and re-run
   `pnpm db:generate`-generated SQL. Rerun `pnpm db:seed` if you extend the seed.

2. **Shared contract** — define `Comment`/`CommentInput` types in
   `shared/types/blog.ts` (or a new `shared/types/comment.ts`) and a Zod schema
   in `shared/utils/schema/comment.ts`. Re-export the schema through
   `shared/utils/schemas.ts` so it auto-imports in routes and forms.

3. **Server service** — add `server/utils/comment/service.ts` with
   `getComments(filters, pagination)`, `createComment(data)`, etc., returning
   standard responses via the `common/` helpers.

4. **API routes** — `server/api/admin/comments/index.get.ts` +
   `index.post.ts` (+ `[id].put.ts` / `[id].delete.ts`). Each one:
   `defineAuthHandler`, validate with `getValidatedQuery` /
   `readValidatedBody` + the shared schema, call the service, return.

5. **Client composables** — `app/composables/useComment.ts`:
   `useCommentsQuery(params)`, `useCommentCreateMutation()`, … following the
   existing `useBlog.ts` / `useCategory.ts` style (cache invalidation + toast
   on success).

6. **Page + components** — `app/pages/admin/comments/index.vue` (thin),
   `app/components/Admin/Comment/List.vue` using `useUrlListState` for
   search/pagination and a `Form.vue` for create/edit.

7. **Permissions** (optional) — register the feature in the permissions seed
   (`server/db/seed.ts`), gate the routes with
   `{ permissions: "comments:create" }`, and the sidebar item will appear for
   users granted it.

## Conventions (the short version)

- Every API response uses the envelope types from `shared/types/response.ts`.
- One endpoint = one file in `server/api/`; logic lives in `server/utils/*`.
- Use `defineAuthHandler` for anything behind a login.
- Composables: `useXxxQuery` / `useXxxMutation` / `useXxxForm`;
  `useUrlListState` for lists.
- New shared types/schemas go in `shared/`, never duplicated in `app/`.
- Comments explain _why_, not _what_ — don't narrate the code.
- No `any` in new code; validate with Zod and use the inferred input types.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and commands.
