# Nuxt Bare — CMS / Blog Platform

A full-stack CMS and blog platform built with [Nuxt 4](https://nuxt.com), [Nuxt UI](https://ui.nuxt.com), and [Drizzle ORM](https://orm.drizzle.team) over SQLite.

## Features

- **Authentication** — register, login, email verification, password reset (session-based via `nuxt-auth-utils`, rate-limited)
- **Multi-language blog** — posts, categories, and tags with localized content (`en` / `id`), language-aware slugs and sitemap hreflang alternates
- **Media library** — upload, folders, auto-generated WebP thumbnails (via `sharp`), public/private privacy, magic-byte file validation
- **Admin panel** (`/admin`) — dashboard, blog management, categories, tags, users, and per-feature permission management
- **User profiles** — profile and password management (`/profile`)
- **SEO** — `@nuxtjs/seo` with dynamic sitemap for posts/categories/tags

## Tech Stack

- **Framework:** Nuxt 4 (Vue 3, Nitro server)
- **UI:** Nuxt UI v4, Tailwind CSS v4
- **Database:** SQLite (`better-sqlite3`) + Drizzle ORM
- **State & data fetching:** Pinia + Pinia Colada
- **Auth:** `nuxt-auth-utils` (sessions, password hashing)
- **Email:** `nodemailer` + `nuxt-email-renderer`
- **Validation:** Zod
- **i18n:** `@nuxtjs/i18n` (no-prefix strategy)

## Quick Start

```bash
pnpm install        # install dependencies
cp .env.example .env  # then fill in secrets
pnpm db:push        # create database schema
pnpm db:seed        # optional: sample data
pnpm dev            # http://localhost:3000
```

> The dev server auto-generates `NUXT_SESSION_PASSWORD` in `.env` on first run.

## Database

SQLite database lives at `./database.db` (see [DATABASE.md](./DATABASE.md)). Schema is defined in `server/db/schema.ts`.

```bash
pnpm db:push      # apply schema changes directly (development)
pnpm db:generate  # create a migration from schema changes
pnpm db:migrate   # apply pending migrations (production)
pnpm db:seed      # seed sample data
pnpm db:studio    # Drizzle Studio GUI
```

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Start dev server on :3000            |
| `pnpm build`     | Production build                     |
| `pnpm preview`   | Preview the production build         |
| `pnpm typecheck` | Type-check the project               |
| `pnpm lint`      | Lint with oxlint                     |
| `pnpm format`    | Format with oxfmt                    |
| `pnpm test`      | Run unit + nuxt test suites (vitest) |
| `pnpm db:*`      | Database management (see above)      |

## Environment Variables

See [.env.example](./.env.example). Key variables:

| Variable                | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `NUXT_SESSION_PASSWORD` | Session signing secret (required in production)                      |
| `NUXT_MAIL_*`           | SMTP configuration for nodemailer                                    |
| `NUXT_APP_NAME`         | Application name                                                     |
| `NUXT_APP_URL`          | Public base URL (used for emails, sitemap)                           |
| `NUXT_TRUST_PROXY`      | `true` when behind a reverse proxy (affects rate-limit IP detection) |

## Project Structure

```
app/
├── components/    # Vue components (Admin/, Common/, Profile/, ...)
├── composables/   # Data-fetching hooks (useBlog, useMedia, useUser, ...)
├── pages/         # Public pages + /admin panel
├── layouts/       # default, auth, admin layouts
└── middleware/    # auth / guest guards
server/
├── api/           # Nitro API routes (auth, blog, media, users, admin)
├── db/            # Drizzle schema, migrations, seed
└── utils/         # Services (auth, post, media, ...) + common helpers
shared/
├── config/        # Shared config (pagination)
├── types/         # Shared TypeScript types
└── utils/         # Shared validation schemas
test/              # Vitest unit + nuxt integration tests
```

## Testing

```bash
pnpm test          # run the full suite (117 tests)
pnpm test:unit     # unit tests only
pnpm test:nuxt     # nuxt integration tests only
```

Tests use an isolated SQLite file (`database.test.db`) so your dev data is never touched.

## Deployment

```bash
pnpm build
```

Then serve `.output/` with any Node host (see [Nuxt deployment docs](https://nuxt.com/docs/getting-started/deployment)). For production:

- Set `NUXT_SESSION_PASSWORD` and `NUXT_MAIL_*` env vars
- Use `pnpm db:migrate` (not `db:push`) to apply schema changes
- If behind a proxy, set `NUXT_TRUST_PROXY=true`
- For multi-instance scaling, switch the database to PostgreSQL/MySQL and move rate-limit storage to a shared driver
